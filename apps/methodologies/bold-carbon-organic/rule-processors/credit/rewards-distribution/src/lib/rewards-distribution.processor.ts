import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/recycling/organic/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  loadParentDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { type MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';

import type { ResultContentWithMassValue } from './rewards-distribution.types';

import {
  MASS_CERTIFICATE_AUDIT_CRITERIA,
  MASS_CRITERIA,
} from './rewards-distribution.constants';
import { calculateRewardsDistribution } from './rewards-distribution.helpers';
import {
  isCertificateRewardDistributionOutput,
  isNonZeroPositive,
  isNumber,
} from './rewards-distribution.processor.typia';

const { END, RULE_EXECUTION, RULES_METADATA } = DocumentEventName;
const { RULE_PROCESSOR_RESULT_CONTENT, RULE_SLUG, UNIT_PRICE } =
  DocumentEventAttributeName;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

export class RewardsDistributionProcessor extends RuleDataProcessor {
  private ErrorMessage = {
    CREDIT_NOT_FOUND: 'The Credit was not found',
    END_EVENT_NOT_FOUND: (documentId: string) =>
      `${END} event not found in the document ${documentId}`,
    INVALID_END_EVENT_VALUE: (documentId: string, value: unknown) =>
      `Invalid ${END} event value ${String(value)} in the document ${documentId}`,
    INVALID_UNIT_PRICE: (
      documentId: string,
      untiPrice: MethodologyDocumentEventAttributeValue | undefined,
    ) => `Invalid ${String(untiPrice)} in the document ${documentId}`,
    MASS_CERTIFICATE_AUDITS_NOT_FOUND:
      'The Mass Certificate Audits was not found',
    REWARDS_DISTRIBUTION_NOT_FOUND: (documentId: string) =>
      `${REWARDS_DISTRIBUTION} ${RULE_EXECUTION} not found in the document ${documentId}`,
    RULES_METADATA_NOT_FOUND: (documentId: string) =>
      `${RULES_METADATA} event not found in the document ${documentId}`,
    UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT: (documentId: string) =>
      `Unexpected ${RULE_PROCESSOR_RESULT_CONTENT} on the ${REWARDS_DISTRIBUTION} ${RULE_EXECUTION} event in the document ${documentId}`,
  };

  private async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    const massCertificateAuditsQuery = await documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: MASS_CERTIFICATE_AUDIT_CRITERIA,
      documentId: ruleInput.documentId,
    });

    return {
      documentQueryService,
      massCertificateAuditsQuery,
    };
  }

  private async getRuleSubject(
    ruleInput: RuleInput,
    documentQueries: {
      documentQueryService: DocumentQueryService;
      massCertificateAuditsQuery: DocumentQuery<Document> | undefined;
    },
  ) {
    const { documentQueryService, massCertificateAuditsQuery } =
      documentQueries;

    const credit = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.documentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    const massCertificateAuditsRuleResultContent =
      await massCertificateAuditsQuery
        ?.iterator()
        .map(
          ({
            document: { externalEvents, id: massCertificateAuditDocumentId },
          }) => {
            const rewardsDistributionEvent = externalEvents?.find(
              and(
                eventNameIsAnyOf([RULE_EXECUTION]),
                metadataAttributeValueIsAnyOf(RULE_SLUG, [
                  REWARDS_DISTRIBUTION,
                ]),
              ),
            );

            if (!rewardsDistributionEvent) {
              throw new Error(
                this.ErrorMessage.REWARDS_DISTRIBUTION_NOT_FOUND(
                  massCertificateAuditDocumentId,
                ),
              );
            }

            const resultContent = getEventAttributeValue(
              rewardsDistributionEvent,
              RULE_PROCESSOR_RESULT_CONTENT,
            );

            if (!isCertificateRewardDistributionOutput(resultContent)) {
              throw new Error(
                this.ErrorMessage.UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT(
                  massCertificateAuditDocumentId,
                ),
              );
            }

            return {
              massCertificateAuditDocumentId,
              resultContent,
            };
          },
        );

    if (isNil(massCertificateAuditsRuleResultContent)) {
      throw new Error(this.ErrorMessage.MASS_CERTIFICATE_AUDITS_NOT_FOUND);
    }

    const resultContentsWithMassValue = await Promise.all(
      massCertificateAuditsRuleResultContent.map(
        async ({ massCertificateAuditDocumentId, resultContent }) => {
          let massValue = new BigNumber(0);

          const massesQuery = await documentQueryService.load({
            context: {
              s3KeyPrefix: ruleInput.documentKeyPrefix,
            },
            criteria: MASS_CRITERIA,
            documentId: massCertificateAuditDocumentId,
          });

          await massesQuery.iterator().each(({ document }) => {
            const massDocumentId = document.id;
            const endEvent = document.externalEvents?.find(
              eventNameIsAnyOf([END]),
            );

            if (!endEvent) {
              throw new Error(
                this.ErrorMessage.END_EVENT_NOT_FOUND(massDocumentId),
              );
            }

            const { value } = endEvent;

            if (!isNumber(value)) {
              throw new Error(
                this.ErrorMessage.INVALID_END_EVENT_VALUE(
                  massDocumentId,
                  value,
                ),
              );
            }

            massValue = massValue.plus(new BigNumber(value));
          });

          return {
            massValue,
            resultContent,
          };
        },
      ),
    );

    return {
      credit,
      resultContentsWithMassValue,
    };
  }

  private result(
    ruleInput: RuleInput,
    ruleSubject: {
      credit: Document | undefined;
      resultContentsWithMassValue: ResultContentWithMassValue[];
    },
  ) {
    const { credit, resultContentsWithMassValue } = ruleSubject;

    if (isNil(credit)) {
      throw new Error(this.ErrorMessage.CREDIT_NOT_FOUND);
    }

    const rulesMetadataEvent = credit.externalEvents?.find(
      eventNameIsAnyOf([RULES_METADATA]),
    );

    if (!rulesMetadataEvent) {
      throw new Error(this.ErrorMessage.RULES_METADATA_NOT_FOUND(credit.id));
    }

    const unitPrice = getEventAttributeValue(rulesMetadataEvent, UNIT_PRICE);

    if (!isNonZeroPositive(unitPrice) || new BigNumber(unitPrice).isNaN()) {
      throw new Error(
        this.ErrorMessage.INVALID_UNIT_PRICE(credit.id, unitPrice),
      );
    }

    return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
      resultContent: calculateRewardsDistribution(
        unitPrice,
        resultContentsWithMassValue,
      ),
    });
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentQueries = await this.generateDocumentQuery(ruleInput);

    const ruleSubject = await this.getRuleSubject(ruleInput, documentQueries);

    return this.result(ruleInput, ruleSubject);
  }
}
