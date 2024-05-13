import type { NonZeroPositive } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  loadParentDocument,
} from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import BigNumber from 'bignumber.js';
import { assert, is } from 'typia';

import type { ResultContentWithMassValue } from './rewards-distribution.types';

import {
  CERTIFICATE_AUDIT_CRITERIA,
  MASS_CRITERIA,
} from './rewards-distribution.constants';
import { calculateRewardsDistribution } from './rewards-distribution.helpers';

const { END, OPEN, RULE_EXECUTION } = DocumentEventName;
const { RULE_PROCESSOR_RESULT_CONTENT, RULE_SLUG, UNIT_PRICE } =
  DocumentEventAttributeName;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

export class RewardsDistributionProcessor extends RuleDataProcessor {
  private ErrorMessage = {
    CERTIFICATE_AUDITS_NOT_FOUND: 'The Certificate Audits was not found',
    INVALID_UNIT_PRICE: 'Unit Price in Offer document is not a string number',
    OFFER_NOT_FOUND: 'The Offer was not found',
    UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT: (id: string) =>
      `${RULE_PROCESSOR_RESULT_CONTENT} is not with the expected value for the id ${id}`,
  };

  private async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    const certificateAuditsQuery = await documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: CERTIFICATE_AUDIT_CRITERIA,
      documentId: ruleInput.documentId,
    });

    return {
      certificateAuditsQuery,
      documentQueryService,
    };
  }

  private async getRuleSubject(
    ruleInput: RuleInput,
    documentQueries: {
      certificateAuditsQuery: DocumentQuery<Document> | undefined;
      documentQueryService: DocumentQueryService;
    },
  ) {
    const { certificateAuditsQuery, documentQueryService } = documentQueries;

    const offer = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.documentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    const certificateAuditsRuleResultContent = await certificateAuditsQuery
      ?.iterator()
      .map(({ document: { externalEvents, id } }) => {
        const resultContent = getEventAttributeValue(
          externalEvents?.find(
            and(
              eventNameIsAnyOf([RULE_EXECUTION]),
              metadataAttributeValueIsAnyOf(RULE_SLUG, [REWARDS_DISTRIBUTION]),
            ),
          ),
          RULE_PROCESSOR_RESULT_CONTENT,
        );

        if (!is<CertificateRewardDistributionOutput>(resultContent)) {
          throw new Error(
            this.ErrorMessage.UNEXPECTED_RULE_PROCESSOR_RESULT_CONTENT(id),
          );
        }

        return {
          id,
          resultContent,
        };
      });

    if (isNil(certificateAuditsRuleResultContent)) {
      throw new Error(this.ErrorMessage.CERTIFICATE_AUDITS_NOT_FOUND);
    }

    const resultContentsWithMassValue = await Promise.all(
      certificateAuditsRuleResultContent.map(async ({ id, resultContent }) => {
        let massValue = new BigNumber(0);

        const massesQuery = await documentQueryService.load({
          context: {
            s3KeyPrefix: ruleInput.documentKeyPrefix,
          },
          criteria: MASS_CRITERIA,
          documentId: id,
        });

        await massesQuery.iterator().each(({ document }) => {
          massValue = massValue.plus(
            new BigNumber(
              assert<number>(
                document.externalEvents?.find(eventNameIsAnyOf([END]))?.value,
              ),
            ),
          );
        });

        return {
          massValue,
          resultContent,
        };
      }),
    );

    return {
      offer,
      resultContentsWithMassValue,
    };
  }

  private result(
    ruleInput: RuleInput,
    ruleSubject: {
      offer: Document | undefined;
      resultContentsWithMassValue: ResultContentWithMassValue[];
    },
  ) {
    const { offer, resultContentsWithMassValue } = ruleSubject;

    if (isNil(offer)) {
      throw new Error(this.ErrorMessage.OFFER_NOT_FOUND);
    }

    const unitPrice = getEventAttributeValue(
      offer.externalEvents?.find(eventNameIsAnyOf([OPEN])),
      UNIT_PRICE,
    );

    if (!is<NonZeroPositive>(unitPrice) || new BigNumber(unitPrice).isNaN()) {
      throw new Error(this.ErrorMessage.INVALID_UNIT_PRICE);
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
