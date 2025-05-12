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
  BoldMethodologyName,
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
import {
  MethodologyDocumentStatus,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { assert } from 'typia';

import { buildDocumentsCriteria } from './certificate-uniqueness-check.constants';
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

  private readonly methodologyName: BoldMethodologyName;

  readonly errorProcessor = new CertificateUniquenessCheckProcessorErrors();

  constructor(
    massIdCertificateMatcher: DocumentMatcher,
    methodologyName: BoldMethodologyName,
  ) {
    super();

    this.massIdCertificateMatcher = massIdCertificateMatcher;
    this.methodologyName = methodologyName;
  }

  private evaluateResult({
    creditDocuments,
    massIdCertificateDocuments,
    relatedMassIdAuditDocuments,
  }: RuleSubject): EvaluateResultOutput {
    if (this.hasSomeValidCreditDocument(creditDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE
          .MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT,
      );
    }

    if (this.hasSomeValidCertificateDocument(massIdCertificateDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT(
          assert<NonEmptyString>(this.massIdCertificateMatcher.match.type),
        ),
      );
    }

    if (this.hasSomeApprovedMassIdAuditDocument(relatedMassIdAuditDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME(
          this.methodologyName,
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
    let relatedMassIdAuditDocuments: Document[] = [];

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (CREDITS.matches(documentReference)) {
        creditDocuments.push(document);
      }

      if (this.massIdCertificateMatcher.matches(documentReference)) {
        massIdCertificateDocuments.push(document);
      }

      if (MASS_ID_AUDIT.matches(documentReference)) {
        relatedMassIdAuditDocuments.push(document);
      }
    });

    relatedMassIdAuditDocuments = relatedMassIdAuditDocuments.filter(
      (document) => document.id !== ruleInput.documentId,
    );

    return {
      creditDocuments,
      massIdCertificateDocuments,
      relatedMassIdAuditDocuments,
    };
  }

  private hasSomeApprovedMassIdAuditDocument(
    massIdAuditDocuments: Document[],
  ): boolean {
    return massIdAuditDocuments.some(
      (document) =>
        document.externalEvents?.some((event) =>
          event.name.includes(this.methodologyName),
        ) === true &&
        document.externalEvents.some((event) =>
          event.name.includes(RuleOutputStatus.APPROVED),
        ) === true,
    );
  }

  private hasSomeValidCertificateDocument(
    massIdCertificateDocuments: Document[],
  ): boolean {
    return massIdCertificateDocuments.some(
      (document) => document.status !== MethodologyDocumentStatus.CANCELLED,
    );
  }

  private hasSomeValidCreditDocument(creditDocuments: Document[]): boolean {
    return creditDocuments.some(
      (document) => document.status !== MethodologyDocumentStatus.CANCELLED,
    );
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
