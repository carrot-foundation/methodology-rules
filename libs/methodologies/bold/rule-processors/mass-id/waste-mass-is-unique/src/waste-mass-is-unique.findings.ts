import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './waste-mass-is-unique.constants';
import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';
import { ruleDefinition } from './waste-mass-is-unique.rule-definition';

export const WASTE_MASS_IS_UNIQUE_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WasteMassIsUniqueProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': { defaultOwner: 'CARROT' },
    'ERROR.MISSING_DROP_OFF_EVENT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_PICK_UP_EVENT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_RECYCLER_EVENT': { defaultOwner: 'INTEGRATOR' },
    'ERROR.MISSING_VEHICLE_LICENSE_PLATE': { defaultOwner: 'TO_CONFIRM' },
    'ERROR.MISSING_WASTE_GENERATOR_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.VALID_DUPLICATE_FOUND': { defaultOwner: 'TO_CONFIRM' },
  },
);
