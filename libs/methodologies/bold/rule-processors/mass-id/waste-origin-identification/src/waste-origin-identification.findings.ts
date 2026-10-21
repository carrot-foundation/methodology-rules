import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './waste-origin-identification.constants';
import { WasteOriginIdentificationProcessorErrors } from './waste-origin-identification.errors';
import { ruleDefinition } from './waste-origin-identification.rule-definition';

export const WASTE_ORIGIN_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WasteOriginIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.MISSING_PICK_UP_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_WASTE_GENERATOR_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MULTIPLE_WASTE_GENERATOR_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'FAILED.WASTE_ORIGIN_CONFLICT': { defaultOwner: 'INTEGRATOR' },
  },
);
