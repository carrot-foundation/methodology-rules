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
  type Document,
  DocumentCategory,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { assert } from 'typia';

import {
  buildDocumentsCriteria,
  METHODOLOGY_NAME_BY_SLUG,
} from './no-conflicting-certificate-or-credit.constants';
import {
  hasNonCancelledDocuments,
  hasPassedOrInProgressMassIDAuditForTheSameMethodology,
} from './no-conflicting-certificate-or-credit.helpers';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';

const { MASS_ID } = DocumentCategory;

interface RuleSubject {
  creditDocuments: Document[];
  massIDCertificateDocuments: Document[];
  relatedMassIDAuditDocuments: Document[];
}

export const RESULT_COMMENTS = {
  PASSED: `The ${MASS_ID} is not linked to a valid ${MASS_ID} Certificate`,
} as const;

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
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
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
          assert<NonEmptyString>(this.massIDCertificateMatcher.match.type),
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
      resultComment: RESULT_COMMENTS.PASSED,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
    ruleInput: RuleInput,
  ): Promise<RuleSubject> {
    const creditDocuments: Document[] = [];
    const massIDCertificateDocuments: Document[] = [];
    const relatedMassIDAuditDocuments: Document[] = [];

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
