import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.constants';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';
import { ruleDefinition } from './participant-accreditations-and-verifications-requirements.rule-definition';

export const PARTICIPANT_ACCREDITATIONS_AND_VERIFICATIONS_REQUIREMENTS_FINDINGS =
  defineRuleFindings(
    ruleDefinition.slug,
    {
      ERROR:
        new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors()
          .ERROR_MESSAGE,
      FAILED: RESULT_COMMENTS.failed,
      REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
    },
    {
      'ERROR.ACCREDITATION_DOCUMENTS_NOT_FOUND': { defaultOwner: 'TO_CONFIRM' },
      'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
      'ERROR.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS': {
        defaultOwner: 'INTEGRATOR',
      },
      'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
      'ERROR.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS': {
        defaultOwner: 'TO_CONFIRM',
      },
      'ERROR.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT': {
        defaultOwner: 'INTEGRATOR',
      },
    },
  );
