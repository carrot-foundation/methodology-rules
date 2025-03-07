import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import { isHomologationActive } from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { isActorEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { CheckParticipantsHomologationProcessorErrors } from './check-participants-homologation.errors';

export interface RuleSubject {
  homologationDocuments: Map<string, Document>;
  massDocument: Document;
}

export class CheckParticipantsHomologationProcessor extends RuleDataProcessor {
  private readonly RESULT_COMMENT = {
    APPROVED: 'The participants are homologated and the homologation is active',
  } as const;

  readonly errorProcessor = new CheckParticipantsHomologationProcessorErrors();

  private evaluateResult({
    homologationDocuments,
    massDocument,
  }: RuleSubject): EvaluateResultOutput {
    this.verifyAllParticipantsHaveHomologationDocuments({
      homologationDocuments,
      massDocument,
    });

    const expiredHomologationDocuments = [
      ...homologationDocuments.values(),
    ].filter((document) => !isHomologationActive(document));

    if (isNonEmptyArray(expiredHomologationDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.HOMOLOGATION_EXPIRED(
          expiredHomologationDocuments.map((document) => document.id),
        ),
      );
    }

    return {
      resultComment: this.RESULT_COMMENT.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const homologationDocuments: Map<string, Document> = new Map();
    let massDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (MASS.matches(documentReference)) {
        massDocument = document;
      }

      if (PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference)) {
        homologationDocuments.set(document.primaryParticipant.id, document);
      }
    });

    if (isNil(massDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    if (homologationDocuments.size === 0) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.HOMOLOGATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return {
      homologationDocuments,
      massDocument,
    };
  }

  private verifyAllParticipantsHaveHomologationDocuments({
    homologationDocuments,
    massDocument,
  }: RuleSubject) {
    if (!isNonEmptyArray(massDocument.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massDocument.id,
        ),
      );
    }

    const actorParticipants: Map<string, string> = new Map(
      massDocument.externalEvents
        .filter((event) => isActorEvent(event))
        // TODO: update to use the event name label instead of the event name
        .map((event) => [event.participant.id, event.name]),
    );

    const participantsWithoutHomologationDocuments = [
      ...actorParticipants.entries(),
    ].filter(([participantId]) => !homologationDocuments.has(participantId));

    if (isNonEmptyArray(participantsWithoutHomologationDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS(
          participantsWithoutHomologationDocuments.map(
            ([participantId]) => actorParticipants.get(participantId) as string,
          ),
        ),
      );
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
      criteria: {
        parentDocument: {},
        relatedDocuments: [PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match],
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
