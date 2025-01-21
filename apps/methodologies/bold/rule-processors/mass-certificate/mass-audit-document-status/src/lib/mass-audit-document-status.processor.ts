import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { MASS_AUDIT } from '@carrot-fndn/methodologies/bold/recycling/organic/matchers';
import {
  and,
  eventHasCarrotParticipant,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  type Document,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DocumentEventName } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { MethodologyEvaluationResult } from '@carrot-fndn/shared/types';

const { CLOSE } = DocumentEventName;
const { METHODOLOGY_EVALUATION_RESULT } = DocumentEventAttributeName;
const { APPROVED } = MethodologyEvaluationResult;

export class MassAuditDocumentStatusProcessor extends RuleDataProcessor {
  private readonly ResultComment = {
    APPROVED:
      'All related documents have a CLOSE event with methodology-evaluation-result = APPROVED',
    REJECTED: 'Some related documents do not meet the criteria',
  };

  private evaluateResult(ruleInput: RuleInput, documents: Array<Document>) {
    const hasCloseEventWithNetworkActor = documents.every((document) =>
      document.externalEvents?.some(
        and(
          eventNameIsAnyOf([CLOSE]),
          metadataAttributeValueIsAnyOf(METHODOLOGY_EVALUATION_RESULT, [
            APPROVED,
          ]),
          (event) => eventHasCarrotParticipant(event, document.dataSetName),
        ),
      ),
    );

    if (!hasCloseEventWithNetworkActor) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.ResultComment.REJECTED,
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
          relatedDocuments: [MASS_AUDIT.match],
        },
      },
      documentId,
    });
  }

  private async getRuleSubject(documentQuery: DocumentQuery<Document>) {
    const documents = await documentQuery.iterator().map(({ document }) => ({
      ...document,
    }));

    return documents.filter((document) =>
      MASS_AUDIT.matches(mapDocumentReference(document)),
    );
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentQuery = await this.generateDocumentQuery(
      ruleInput.documentKeyPrefix,
      ruleInput.documentId,
    );

    const documents = await this.getRuleSubject(documentQuery);

    return this.evaluateResult(ruleInput, documents);
  }
}
