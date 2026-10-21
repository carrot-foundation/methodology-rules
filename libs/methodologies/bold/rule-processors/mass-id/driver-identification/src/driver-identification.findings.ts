import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './driver-identification.constants';
import { DriverIdentificationProcessorErrors } from './driver-identification.errors';
import { ruleDefinition } from './driver-identification.rule-definition';

export const DRIVER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new DriverIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.DRIVER_AND_JUSTIFICATION_PROVIDED': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_JUSTIFICATION': { defaultOwner: 'TO_CONFIRM' },
  },
);
