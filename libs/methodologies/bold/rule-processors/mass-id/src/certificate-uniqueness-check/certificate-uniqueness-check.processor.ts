import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getOrUndefined } from '@carrot-fndn/shared/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  CREDITS,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldMethodologySlug,
  type Document,
  DocumentCategory,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { assert } from 'typia';

import {
  METHODOLOGY_NAME_BY_SLUG,
  buildDocumentsCriteria,
} from './certificate-uniqueness-check.constants';
import {
  hasApprovedOrInProgressMassIdAuditForTheSameMethodology,
  hasSomeDocumentOpen,
} from './certificate-uniqueness-check.helpers';
import { CertificateUniquenessCheckProcessorErrors } from './certificate-uniqueness-check.processor.errors';

const { MASS_ID } = DocumentCategory;

export interface RuleSubject {
  creditDocuments: Document[];
  massIdCertificateDocuments: Document[];
  relatedMassIdAuditDocuments: Document[];
}

export const RESULT_COMMENTS = {
  APPROVED: `The ${MASS_ID} is not linked to a valid ${MASS_ID} Certificate`,
} as const;

export class CertificateUniquenessCheck extends RuleDataProcessor {
  private readonly massIdCertificateMatcher: DocumentMatcher;

  private readonly methodologySlug: BoldMethodologySlug;

  readonly errorProcessor = new CertificateUniquenessCheckProcessorErrors();

  constructor(
    massIdCertificateMatcher: DocumentMatcher,
    methodologySlug: BoldMethodologySlug,
  ) {
    super();

    this.massIdCertificateMatcher = massIdCertificateMatcher;
    this.methodologySlug = methodologySlug;
  }

  private evaluateResult({
    creditDocuments,
    massIdCertificateDocuments,
    relatedMassIdAuditDocuments,
  }: RuleSubject): EvaluateResultOutput {
    if (hasSomeDocumentOpen(creditDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE
          .MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT,
      );
    }

    if (hasSomeDocumentOpen(massIdCertificateDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT(
          assert<NonEmptyString>(this.massIdCertificateMatcher.match.type),
        ),
      );
    }

    if (
      hasApprovedOrInProgressMassIdAuditForTheSameMethodology(
        relatedMassIdAuditDocuments,
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
      resultComment: RESULT_COMMENTS.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
    ruleInput: RuleInput,
  ): Promise<RuleSubject> {
    const creditDocuments: Document[] = [];
    const massIdCertificateDocuments: Document[] = [];
    const relatedMassIdAuditDocuments: Document[] = [];

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (CREDITS.matches(documentReference)) {
        creditDocuments.push(document);
      }

      if (this.massIdCertificateMatcher.matches(documentReference)) {
        massIdCertificateDocuments.push(document);
      }

      if (
        MASS_ID_AUDIT.matches(documentReference) &&
        documentReference.documentId !== ruleInput.documentId
      ) {
        relatedMassIdAuditDocuments.push(document);
      }
    });

    return {
      creditDocuments,
      massIdCertificateDocuments,
      relatedMassIdAuditDocuments,
    };
  }

  protected async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: buildDocumentsCriteria(this.massIdCertificateMatcher),
      documentId: ruleInput.documentId,
    });
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
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }
}
