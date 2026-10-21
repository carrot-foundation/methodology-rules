import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './hauler-identification.constants';
import { HaulerIdentificationProcessorErrors } from './hauler-identification.errors';
import { ruleDefinition } from './hauler-identification.rule-definition';

export const HAULER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new HaulerIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.HAULER_EVENT_MISSING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.PICK_UP_EVENT_MISSING': { defaultOwner: 'INTEGRATOR' },
  },
);
