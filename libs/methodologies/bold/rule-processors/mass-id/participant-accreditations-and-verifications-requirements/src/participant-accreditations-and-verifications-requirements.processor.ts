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
import {
  type BoldDocument,
  BoldDocumentEventLabel,
  BoldDocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.constants';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';

const ACTORS_REQUIRING_DATES: ReadonlySet<BoldDocumentEventLabel> = new Set([
  BoldDocumentEventLabel.PROCESSOR,
  BoldDocumentEventLabel.RECYCLER,
]);

const ACTORS_WITH_OPTIONAL_DATES: ReadonlySet<BoldDocumentEventLabel> = new Set(
  [BoldDocumentEventLabel.INTEGRATOR],
);

interface RuleSubject {
  accreditationDocuments: Map<string, BoldDocument[]>;
  massIDDocument: BoldDocument;
}

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
      criteria: {
        parentDocument: {},
        relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  private evaluateResult({
    accreditationDocuments,
    massIDDocument,
  }: RuleSubject): EvaluateResultOutput {
    this.verifyAllParticipantsHaveAccreditationDocuments({
      accreditationDocuments,
      massIDDocument,
    });

    const actorParticipants = this.getActorParticipants(massIDDocument);

    const validationError = this.validateAllActors(
      actorParticipants,
      accreditationDocuments,
    );

    if (validationError) {
      throw validationError;
    }

    return {
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
    };
  }

  private getActorParticipants(
    massIDDocument: BoldDocument,
  ): Map<string, BoldDocumentEventLabel> {
    // externalEvents is guaranteed to exist by verifyAllParticipantsHaveAccreditationDocuments
    return new Map(
      massIDDocument
        .externalEvents!.filter(
          eventLabelIsAnyOf([
            BoldDocumentEventLabel.INTEGRATOR,
            BoldDocumentEventLabel.PROCESSOR,
            BoldDocumentEventLabel.RECYCLER,
          ]),
        )
        .map((event) => [
          event.participant.id,
          event.label as BoldDocumentEventLabel,
        ]),
    );
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
  ): Promise<RuleSubject> {
    const accreditationDocuments: Map<string, BoldDocument[]> = new Map();
    let massIDDocument: BoldDocument | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
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

    if (isNil(massIDDocument)) {
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
      massIDDocument,
    };
  }

  private validateActor(
    participantId: string,
    actorType: BoldDocumentEventLabel,
    participantDocuments: BoldDocument[],
    missingParticipants: string[],
    participantsWithMultipleValid: Array<{
      actorType: string;
      participantId: string;
    }>,
    isValidAccreditation: (document: BoldDocument) => boolean,
  ): void {
    const documentsForActorType = participantDocuments.filter((document) => {
      const documentRelation = mapDocumentRelation(document);

      return (
        documentRelation.subtype ===
        (actorType as unknown as BoldDocumentSubtype)
      );
    });

    const validAccreditations = documentsForActorType.filter((document) =>
      isValidAccreditation(document),
    );

    if (validAccreditations.length === 0) {
      missingParticipants.push(actorType);
    } else if (validAccreditations.length > 1) {
      participantsWithMultipleValid.push({ actorType, participantId });
    }
  }

  private validateAllActors(
    actorParticipants: Map<string, BoldDocumentEventLabel>,
    accreditationDocuments: Map<string, BoldDocument[]>,
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
        /* v8 ignore start -- actorType is always in one of the two sets */
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
      /* v8 ignore stop */
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
    massIDDocument,
  }: Omit<RuleSubject, 'massIDAuditDocument'>) {
    if (!isNonEmptyArray(massIDDocument.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massIDDocument.id,
        ),
      );
    }

    const actorParticipants: Map<string, string> = new Map(
      massIDDocument.externalEvents
        .filter(
          eventLabelIsAnyOf([
            BoldDocumentEventLabel.INTEGRATOR,
            BoldDocumentEventLabel.PROCESSOR,
            BoldDocumentEventLabel.RECYCLER,
          ]),
        )
        .map((event) => [event.participant.id, event.label as string]),
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
