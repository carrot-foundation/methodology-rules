import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  isNil,
  isNonEmptyArray,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  loadParentDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  eventHasName,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { type NonZeroPositive } from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';
import { is } from 'typia';

import type { ResultContentsWithMassIdCertificateValue } from './rewards-distribution.types';

import { RewardsDistributionProcessorErrors } from './rewards-distribution.errors';
import { calculateRewardsDistribution } from './rewards-distribution.helpers';

const { RULES_METADATA } = DocumentEventName;
const { REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT, UNIT_PRICE } =
  DocumentEventAttributeName;

export const RESULT_COMMENTS = {} as const;

interface RuleSubject {
  creditsDocumentUnitPrice: NonZeroPositive;
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[];
}

export class RewardsDistributionProcessor extends RuleDataProcessor {
  readonly errorProcessor = new RewardsDistributionProcessorErrors();

  constructor(private readonly certificateMatch: DocumentMatcher) {
    super();
  }

  async generateCertificateDocumentsQuery(
    ruleInput: RuleInput,
  ): Promise<DocumentQuery<Document> | undefined> {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: {
        relatedDocuments: [this.certificateMatch.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  async getCreditsUnitPrice(ruleInput: RuleInput): Promise<NonZeroPositive> {
    const creditsDocument = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.documentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (isNil(creditsDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.CREDITS_DOCUMENT_NOT_FOUND,
      );
    }

    const unitPrice = getEventAttributeValue(
      creditsDocument.externalEvents?.find((event) =>
        eventHasName(event, RULES_METADATA),
      ),
      UNIT_PRICE,
    );

    if (!is<NonZeroPositive>(unitPrice) || new BigNumber(unitPrice).isNaN()) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.INVALID_UNIT_PRICE,
      );
    }

    return unitPrice;
  }

  getRewardsDistributionRuleValue(
    massIdCertificateDocument: Document,
  ): CertificateRewardDistributionOutput {
    const rulesMetadataEvent = massIdCertificateDocument.externalEvents?.find(
      eventNameIsAnyOf([RULES_METADATA]),
    );

    const rewardsDistributionRuleResultContent = getEventAttributeValue(
      rulesMetadataEvent,
      REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT,
    );

    if (
      !is<CertificateRewardDistributionOutput>(
        rewardsDistributionRuleResultContent,
      )
    ) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.REWARDS_DISTRIBUTION_RULE_RESULT_CONTENT_NOT_FOUND(
          massIdCertificateDocument.id,
        ),
      );
    }

    return rewardsDistributionRuleResultContent;
  }

  async getRuleSubject(ruleInput: RuleInput): Promise<RuleSubject> {
    const certificateDocumentsQuery =
      await this.generateCertificateDocumentsQuery(ruleInput);

    const resultContentsWithMassIdCertificateValue =
      await certificateDocumentsQuery?.iterator().map(
        ({ document }): ResultContentsWithMassIdCertificateValue => ({
          massIdCertificateValue: new BigNumber(document.currentValue),
          resultContent: this.getRewardsDistributionRuleValue(document),
        }),
      );

    if (!isNonEmptyArray(resultContentsWithMassIdCertificateValue)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.CERTIFICATE_DOCUMENT_NOT_FOUND(
          this.certificateMatch.match.type,
        ),
      );
    }

    return {
      creditsDocumentUnitPrice: await this.getCreditsUnitPrice(ruleInput),
      resultContentsWithMassIdCertificateValue,
    };
  }

  override async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const ruleSubject = await this.getRuleSubject(ruleInput);

      const resultContent = calculateRewardsDistribution(ruleSubject);

      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultContent,
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }
}
