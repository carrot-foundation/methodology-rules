import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getOrUndefined } from '@carrot-fndn/shared/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  CREDIT_ORDER_MATCH,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldMethodologySlug,
  type BoldDocument,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';

import {
  buildDocumentsCriteria,
  METHODOLOGY_NAME_BY_SLUG,
  RESULT_COMMENTS,
} from './no-conflicting-certificate-or-credit.constants';
import {
  hasNonCancelledDocuments,
  hasPassedOrInProgressMassIDAuditForTheSameMethodology,
} from './no-conflicting-certificate-or-credit.helpers';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';

interface RuleSubject {
  creditDocuments: BoldDocument[];
  massIDCertificateDocuments: BoldDocument[];
  relatedMassIDAuditDocuments: BoldDocument[];
}

export class NoConflictingCertificateOrCreditProcessor extends RuleDataProcessor {
  readonly errorProcessor =
    new NoConflictingCertificateOrCreditProcessorErrors();

  private readonly massIDCertificateMatcher: DocumentMatcher;

  private readonly methodologySlug: BoldMethodologySlug;

  constructor(
    massIDCertificateMatcher: DocumentMatcher,
    methodologySlug: BoldMethodologySlug,
  ) {
    super();

    this.massIDCertificateMatcher = massIDCertificateMatcher;
    this.methodologySlug = methodologySlug;
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);

      const ruleSubject = await this.getRuleSubject(documentsQuery, ruleInput);

      const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }

  protected async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: buildDocumentsCriteria(this.massIDCertificateMatcher),
      documentId: ruleInput.documentId,
    });
  }

  private evaluateResult({
    creditDocuments,
    massIDCertificateDocuments,
    relatedMassIDAuditDocuments,
  }: RuleSubject): EvaluateResultOutput {
    if (hasNonCancelledDocuments(creditDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE
          .MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT,
      );
    }

    if (hasNonCancelledDocuments(massIDCertificateDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT(
          this.massIDCertificateMatcher.match.type as NonEmptyString,
        ),
      );
    }

    if (
      hasPassedOrInProgressMassIDAuditForTheSameMethodology(
        relatedMassIDAuditDocuments,
        this.methodologySlug,
      )
    ) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
          METHODOLOGY_NAME_BY_SLUG[this.methodologySlug],
        ),
      );
    }

    return {
      resultComment: RESULT_COMMENTS.passed.NO_CONFLICTING_CERTIFICATE,
      resultStatus: 'PASSED',
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
    ruleInput: RuleInput,
  ): Promise<RuleSubject> {
    const creditDocuments: BoldDocument[] = [];
    const massIDCertificateDocuments: BoldDocument[] = [];
    const relatedMassIDAuditDocuments: BoldDocument[] = [];

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (CREDIT_ORDER_MATCH.matches(documentRelation)) {
        creditDocuments.push(document);
      }

      if (this.massIDCertificateMatcher.matches(documentRelation)) {
        massIDCertificateDocuments.push(document);
      }

      if (
        MASS_ID_AUDIT.matches(documentRelation) &&
        documentRelation.documentId !== ruleInput.documentId
      ) {
        relatedMassIDAuditDocuments.push(document);
      }
    });

    return {
      creditDocuments,
      massIDCertificateDocuments,
      relatedMassIDAuditDocuments,
    };
  }
}
