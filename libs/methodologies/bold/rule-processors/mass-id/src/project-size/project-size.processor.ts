import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { ProjectSizeProcessorErrors } from './project-size.errors';

export interface RuleSubject {
  projectSize: number;
}

export class ProjectSizeProcessor extends RuleDataProcessor {
  private readonly RESULT_COMMENT = {
    APPROVED:
      'The recycler meets the criterion of a maximum reduction of 60,000 metric tons of CO2 in one year.',
    REJECTED:
      'The recycler does not meet the criterion of a maximum reduction of 60,000 metric tons of CO2 in one year.',
  } as const;

  readonly errorProcessor = new ProjectSizeProcessorErrors();

  private evaluateResult({ projectSize }: RuleSubject): EvaluateResultOutput {
    if (projectSize > 60_000) {
      return {
        resultComment: this.RESULT_COMMENT.REJECTED,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  private getProjectSize(recyclerHomologationDocument: Document): number {
    if (!isNonEmptyArray(recyclerHomologationDocument.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE
          .HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_EVENTS,
      );
    }

    const businessDocumentEvent =
      recyclerHomologationDocument.externalEvents.find(
        (event) =>
          event.name === DocumentEventName.BUSINESS_DOCUMENT.toString(),
      );

    const projectSize = getEventAttributeValue(
      businessDocumentEvent,
      DocumentEventAttributeName.PROJECT_SIZE,
    );

    if (isNil(projectSize)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE
          .HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_PROJECT_SIZE,
      );
    }

    return Number(projectSize);
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    let recyclerHomologationDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches({
          ...documentReference,
          subtype: DocumentSubtype.RECYCLER,
        })
      ) {
        recyclerHomologationDocument = document;
      }
    });

    if (isNil(recyclerHomologationDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.HOMOLOGATION_DOCUMENT_NOT_FOUND,
      );
    }

    return {
      projectSize: this.getProjectSize(recyclerHomologationDocument),
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
      criteria: {
        parentDocument: {},
        relatedDocuments: [
          {
            ...PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match,
            subtype: DocumentSubtype.RECYCLER,
          },
        ],
      },
      documentId: ruleInput.documentId,
    });
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);

      const ruleSubject = await this.getRuleSubject(documentsQuery);

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
