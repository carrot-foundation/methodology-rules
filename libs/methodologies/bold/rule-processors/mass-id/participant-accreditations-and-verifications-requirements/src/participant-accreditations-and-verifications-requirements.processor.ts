import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import { isAccreditationValid } from '@carrot-fndn/shared/methodologies/bold/helpers';
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

interface RuleSubject {
  accreditationDocuments: Map<string, Document>;
  massIdDocument: Document;
}

export const RESULT_COMMENTS = {
  INVALID_ACCREDITATION_DOCUMENTS: (documentIds: string[]) =>
    `These accreditations-and-verifications are invalid: ${documentIds.join(', ')}`,
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

    const invalidAccreditationDocuments = [
      ...accreditationDocuments.values(),
    ].filter((document) => !isAccreditationValid(document));

    if (isNonEmptyArray(invalidAccreditationDocuments)) {
      return {
        resultComment: RESULT_COMMENTS.INVALID_ACCREDITATION_DOCUMENTS(
          invalidAccreditationDocuments.map((document) => document.id),
        ),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.PASSED,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const accreditationDocuments: Map<string, Document> = new Map();
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (MASS_ID.matches(documentRelation)) {
        massIdDocument = document;
      }

      if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation)) {
        accreditationDocuments.set(document.primaryParticipant.id, document);
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
            MethodologyDocumentEventLabel.HAULER,
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
    ].filter(([participantId]) => !accreditationDocuments.has(participantId));

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
