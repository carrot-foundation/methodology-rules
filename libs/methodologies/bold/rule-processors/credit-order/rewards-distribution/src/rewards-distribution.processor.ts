import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  isNil,
  isNonEmptyArray,
  isNonZeroPositive,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  loadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type CertificateRewardDistributionOutput,
  type Document,
  DocumentEventAttributeName,
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

import type {
  ResultContentsWithMassIdCertificateValue,
  RuleSubject,
} from './rewards-distribution.types';

import { RewardsDistributionProcessorErrors } from './rewards-distribution.errors';
import { calculateRewardsDistribution } from './rewards-distribution.helpers';

const { CREDIT_UNIT_PRICE, RULE_RESULT_DETAILS } = DocumentEventAttributeName;

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

  async getCreditUnitPrice(ruleInput: RuleInput): Promise<NonZeroPositive> {
    const creditOrderDocument = await loadDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.documentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (isNil(creditOrderDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.CREDIT_ORDER_DOCUMENT_NOT_FOUND,
      );
    }

    const creditsEvent = creditOrderDocument.externalEvents?.find((event) =>
      eventHasMetadataAttribute({
        event,
        metadataName: CREDIT_UNIT_PRICE,
      }),
    );

    const unitPrice = getEventAttributeValue(creditsEvent, CREDIT_UNIT_PRICE);

    if (!isNonZeroPositive(unitPrice)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.INVALID_CREDIT_UNIT_PRICE,
      );
    }

    return unitPrice;
  }

  getRewardsDistributionRuleValue(
    massIdCertificateDocument: Document,
  ): CertificateRewardDistributionOutput {
    const rewardsDistributionRuleEvent =
      massIdCertificateDocument.externalEvents?.find((event) =>
        eventHasMetadataAttribute({
          event,
          metadataName: DocumentEventAttributeName.SLUG,
          metadataValues: 'rewards-distribution',
        }),
      );
    const rewardsDistributionRuleResultContent = getEventAttributeValue(
      rewardsDistributionRuleEvent,
      RULE_RESULT_DETAILS,
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
      creditUnitPrice: new BigNumber(await this.getCreditUnitPrice(ruleInput)),
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
