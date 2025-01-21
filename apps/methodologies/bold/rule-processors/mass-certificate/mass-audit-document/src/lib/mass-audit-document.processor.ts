import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  getAuditorActorEvent,
  getEventMethodologySlug,
} from '@carrot-fndn/methodologies/bold/recycling/organic/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { MASS_AUDIT } from '@carrot-fndn/methodologies/bold/recycling/organic/matchers';
import {
  type Document,
  type DocumentReference,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class MassAuditDocumentProcessor extends RuleDataProcessor {
  private ResultComment = {
    APPROVED:
      'All documents with Methodology category and Mass Audit type have methodology slug bold',
    REJECTED: (documentIds: string[]) =>
      `These documents does not have the bold methodology slug: [${String(documentIds)}]`,
    REJECTED_NOT_FOUND:
      'Documents with Methodology category and Mass Audit type not found',
  };

  private evaluateResult(
    ruleInput: RuleInput,
    documentReferences: Array<
      DocumentReference & {
        methodologySlug: MethodologyDocumentEventAttributeValue | undefined;
      }
    >,
    massCertificateAuditMethodologySlug:
      | MethodologyDocumentEventAttributeValue
      | undefined,
  ) {
    const documentsWithoutExpectedSlug = documentReferences.filter(
      ({ methodologySlug }) =>
        methodologySlug !== massCertificateAuditMethodologySlug,
    );

    if (documentsWithoutExpectedSlug.length > 0) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.ResultComment.REJECTED(
          documentsWithoutExpectedSlug.map(({ documentId }) => documentId),
        ),
      });
    }

    return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
      resultComment: this.ResultComment.APPROVED,
    });
  }

  private async generateDocumentQuery(
    documentKeyPrefix: string,
    documentId: string,
  ) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: documentKeyPrefix,
      },
      criteria: {
        parentDocument: {
          omit: true,
          relatedDocuments: [MASS_AUDIT.match],
        },
      },
      documentId,
    });
  }

  private async getRuleSubject(documentQuery: DocumentQuery<Document>) {
    return {
      documents: await documentQuery.iterator().map(({ document }) => ({
        ...mapDocumentReference(document),
        methodologySlug: getEventMethodologySlug(
          getAuditorActorEvent(document),
        ),
      })),
      massCertificateAuditMethodologySlug: getEventMethodologySlug(
        getAuditorActorEvent(documentQuery.rootDocument),
      ),
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentQuery = await this.generateDocumentQuery(
      ruleInput.documentKeyPrefix,
      ruleInput.documentId,
    );

    const { documents, massCertificateAuditMethodologySlug } =
      await this.getRuleSubject(documentQuery);

    return this.evaluateResult(
      ruleInput,
      documents,
      massCertificateAuditMethodologySlug,
    );
  }
}
