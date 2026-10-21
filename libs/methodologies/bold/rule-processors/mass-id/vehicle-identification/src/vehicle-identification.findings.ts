import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './vehicle-identification.constants';
import { VehicleIdentificationProcessorErrors } from './vehicle-identification.errors';
import { ruleDefinition } from './vehicle-identification.rule-definition';

export const VEHICLE_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new VehicleIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.INVALID_LICENSE_PLATE_FORMAT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_VEHICLE_TYPE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.LICENSE_PLATE_MISSING': { defaultOwner: 'TO_CONFIRM' },
    'FAILED.PICK_UP_EVENT_MISSING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.VEHICLE_DESCRIPTION_MISSING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.VEHICLE_TYPE_MISSING': { defaultOwner: 'INTEGRATOR' },
  },
);
