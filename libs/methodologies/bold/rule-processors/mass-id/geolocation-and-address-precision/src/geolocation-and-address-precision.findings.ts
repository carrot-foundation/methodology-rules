import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import { ruleDefinition } from './geolocation-and-address-precision.rule-definition';

export const GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new GeolocationAndAddressPrecisionProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
    'ERROR.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS': {
      defaultOwner: 'INTEGRATOR',
    },
    'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
    'ERROR.PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND': {
      defaultOwner: 'TO_CONFIRM',
    },
    'FAILED.FAILED_ADDRESS_SIMILARITY': { defaultOwner: 'INTEGRATOR' },
    'FAILED.FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES': {
      defaultOwner: 'INTEGRATOR',
    },
    'FAILED.INVALID_ACTOR_TYPE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_ADDRESS_DISTANCE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_GPS_DISTANCE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES': {
      defaultOwner: 'INTEGRATOR',
    },
    'FAILED.MISMATCHED_COUNTRY_OR_STATE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES': {
      defaultOwner: 'INTEGRATOR',
    },
    'FAILED.MISSING_ACCREDITATION_ADDRESS': { defaultOwner: 'CARROT' },
    'FAILED.MISSING_ACCREDITED_ADDRESS_COORDINATES': { defaultOwner: 'CARROT' },
    'REVIEW_REQUIRED.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY': {
      defaultOwner: 'TO_CONFIRM',
    },
    'REVIEW_REQUIRED.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES':
      { defaultOwner: 'TO_CONFIRM' },
  },
);
