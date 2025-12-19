import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import {
  isAccreditationValid,
  isAccreditationValidWithOptionalDates,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { eventLabelIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventLabel,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';
import { assert } from 'typia';

import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';

const ACTORS_REQUIRING_DATES = new Set([
  MethodologyDocumentEventLabel.INTEGRATOR,
  MethodologyDocumentEventLabel.PROCESSOR,
  MethodologyDocumentEventLabel.RECYCLER,
]);

const ACTORS_WITH_OPTIONAL_DATES = new Set([
  MethodologyDocumentEventLabel.WASTE_GENERATOR,
]);

interface RuleSubject {
  accreditationDocuments: Map<string, Document[]>;
  massIdDocument: Document;
}

export const RESULT_COMMENTS = {
  PASSED:
    'All participant accreditations-and-verifications are active and approved.',
} as const;

export class ParticipantAccreditationsAndVerificationsRequirementsProcessor extends RuleDataProcessor {
  readonly errorProcessor =
    new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);

      const ruleSubject = await this.getRuleSubject(documentsQuery);

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
      criteria: {
        parentDocument: {},
        relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  private evaluateResult({
    accreditationDocuments,
    massIdDocument,
  }: RuleSubject): EvaluateResultOutput {
    this.verifyAllParticipantsHaveAccreditationDocuments({
      accreditationDocuments,
      massIdDocument,
    });

    const actorParticipants = this.getActorParticipants(massIdDocument);

    const validationError = this.validateAllActors(
      actorParticipants,
      accreditationDocuments,
    );

    if (validationError) {
      throw validationError;
    }

    return {
      resultComment: RESULT_COMMENTS.PASSED,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  private getActorParticipants(
    massIdDocument: Document,
  ): Map<string, MethodologyDocumentEventLabel> {
    // externalEvents is guaranteed to exist by verifyAllParticipantsHaveAccreditationDocuments
    return new Map(
      massIdDocument
        .externalEvents!.filter(
          eventLabelIsAnyOf([
            MethodologyDocumentEventLabel.INTEGRATOR,
            MethodologyDocumentEventLabel.PROCESSOR,
            MethodologyDocumentEventLabel.RECYCLER,
            MethodologyDocumentEventLabel.WASTE_GENERATOR,
          ]),
        )
        .map((event) => [
          event.participant.id,
          assert<MethodologyDocumentEventLabel>(event.label),
        ]),
    );
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const accreditationDocuments: Map<string, Document[]> = new Map();
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (MASS_ID.matches(documentRelation)) {
        massIdDocument = document;
      }

      if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation)) {
        const participantId = document.primaryParticipant.id;
        const existingDocuments =
          accreditationDocuments.get(participantId) ?? [];

        accreditationDocuments.set(participantId, [
          ...existingDocuments,
          document,
        ]);
      }
    });

    if (isNil(massIdDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    if (accreditationDocuments.size === 0) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return {
      accreditationDocuments,
      massIdDocument,
    };
  }

  private validateActor(
    participantId: string,
    actorType: MethodologyDocumentEventLabel,
    participantDocuments: Document[],
    missingParticipants: string[],
    participantsWithMultipleValid: Array<{
      actorType: string;
      participantId: string;
    }>,
    isValidAccreditation: (document: Document) => boolean,
  ): void {
    const validAccreditations = participantDocuments.filter((document) =>
      isValidAccreditation(document),
    );

    if (validAccreditations.length === 0) {
      missingParticipants.push(actorType);
    } else if (validAccreditations.length > 1) {
      participantsWithMultipleValid.push({ actorType, participantId });
    }
  }

  private validateAllActors(
    actorParticipants: Map<string, MethodologyDocumentEventLabel>,
    accreditationDocuments: Map<string, Document[]>,
  ): Error | undefined {
    const missingParticipants: string[] = [];
    const participantsWithMultipleValid: Array<{
      actorType: string;
      participantId: string;
    }> = [];

    for (const [participantId, actorType] of actorParticipants.entries()) {
      // Documents are guaranteed to exist by verifyAllParticipantsHaveAccreditationDocuments
      const participantDocuments = accreditationDocuments.get(participantId)!;

      if (ACTORS_REQUIRING_DATES.has(actorType)) {
        this.validateActor(
          participantId,
          actorType,
          participantDocuments,
          missingParticipants,
          participantsWithMultipleValid,
          isAccreditationValid,
        );
      } else if (ACTORS_WITH_OPTIONAL_DATES.has(actorType)) {
        this.validateActor(
          participantId,
          actorType,
          participantDocuments,
          missingParticipants,
          participantsWithMultipleValid,
          isAccreditationValidWithOptionalDates,
        );
      }
    }

    if (isNonEmptyArray(missingParticipants)) {
      return this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
          missingParticipants,
        ),
      );
    }

    if (isNonEmptyArray(participantsWithMultipleValid)) {
      const firstParticipant = participantsWithMultipleValid[0] as {
        actorType: string;
        participantId: string;
      };

      return this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT(
          firstParticipant.participantId,
          firstParticipant.actorType,
        ),
      );
    }

    return undefined;
  }

  private verifyAllParticipantsHaveAccreditationDocuments({
    accreditationDocuments,
    massIdDocument,
  }: Omit<RuleSubject, 'massIdAuditDocument'>) {
    if (!isNonEmptyArray(massIdDocument.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massIdDocument.id,
        ),
      );
    }

    const actorParticipants: Map<string, string> = new Map(
      massIdDocument.externalEvents
        .filter(
          eventLabelIsAnyOf([
            MethodologyDocumentEventLabel.INTEGRATOR,
            MethodologyDocumentEventLabel.PROCESSOR,
            MethodologyDocumentEventLabel.RECYCLER,
            MethodologyDocumentEventLabel.WASTE_GENERATOR,
          ]),
        )
        .map((event) => [
          event.participant.id,
          assert<NonEmptyString>(event.label),
        ]),
    );

    const participantsWithoutAccreditationDocuments = [
      ...actorParticipants.entries(),
    ].filter(
      ([participantId]) =>
        !accreditationDocuments.has(participantId) ||
        accreditationDocuments.get(participantId)!.length === 0,
    );

    if (isNonEmptyArray(participantsWithoutAccreditationDocuments)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
          participantsWithoutAccreditationDocuments.map(
            ([participantId]) => actorParticipants.get(participantId) as string,
          ),
        ),
      );
    }
  }
}
