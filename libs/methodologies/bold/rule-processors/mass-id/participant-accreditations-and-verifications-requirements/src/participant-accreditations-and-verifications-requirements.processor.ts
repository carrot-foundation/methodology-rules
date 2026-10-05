import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { getOrUndefined, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type AccreditationEvaluationContext,
  type AccreditationRole,
  selectActorAccreditation,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  collectAccreditationDocuments,
  type DocumentQuery,
  loadAccreditationDocumentQuery,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { isActorEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { type BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import { type EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.constants';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';

interface RuleSubject {
  accreditationDocuments: BoldDocument[];
  evaluation: AccreditationEvaluationContext;
  massIDDocument: BoldDocument;
}

const REQUIRED_ROLES = [
  'Integrator',
  'Processor',
  'Recycler',
] as const satisfies readonly AccreditationRole[];

export class ParticipantAccreditationsAndVerificationsRequirementsProcessor extends RuleDataProcessor {
  readonly errorProcessor =
    new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const legacyEvaluationDate = new Date().toISOString();

    try {
      const documentsQuery = await this.generateDocumentQuery(
        ruleInput,
        legacyEvaluationDate,
      );
      const ruleSubject = await this.getRuleSubject(
        documentsQuery,
        legacyEvaluationDate,
      );
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

  protected async generateDocumentQuery(
    ruleInput: RuleInput,
    legacyEvaluationDate: string,
  ) {
    return loadAccreditationDocumentQuery({
      context: { s3KeyPrefix: ruleInput.documentKeyPrefix },
      documentId: ruleInput.documentId,
      legacyEvaluationDate,
    });
  }

  private evaluateResult(subject: RuleSubject): EvaluateResultOutput {
    const { accreditationDocuments, evaluation, massIDDocument } = subject;

    if (!isNonEmptyArray(massIDDocument.externalEvents)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS(
          massIDDocument.id,
        ),
      );
    }

    const actors = massIDDocument.externalEvents.filter((event) =>
      isActorEvent(event),
    );
    const missing: string[] = [];
    let ambiguous:
      | undefined
      | { participantId: string; role: AccreditationRole };

    for (const role of REQUIRED_ROLES) {
      for (const actor of actors.filter((event) => event.label === role)) {
        const selection = selectActorAccreditation({
          accreditationDocuments,
          actorScope: {
            facilityId: actor.address.id,
            participantId: actor.participant.id,
          },
          evaluation,
          massIDDocument,
          role,
        });

        if (selection.status === 'AMBIGUOUS') {
          ambiguous = { participantId: actor.participant.id, role };
        } else if (selection.status !== 'SELECTED' && !missing.includes(role)) {
          missing.push(role);
        }
      }
    }

    if (isNonEmptyArray(missing)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS(
          missing,
        ),
      );
    }

    if (ambiguous !== undefined) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT(
          ambiguous.participantId,
          ambiguous.role,
        ),
      );
    }

    return {
      resultComment: RESULT_COMMENTS.passed.ALL_ACCREDITATIONS_APPROVED,
      resultStatus: 'PASSED',
    };
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
    legacyEvaluationDate: string,
  ): Promise<RuleSubject> {
    const subject = await collectAccreditationDocuments(
      documentQuery,
      legacyEvaluationDate,
    );

    if (subject.massIDDocument === undefined) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    if (subject.accreditationDocuments.length === 0) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.ACCREDITATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return { ...subject, massIDDocument: subject.massIDDocument };
  }
}
