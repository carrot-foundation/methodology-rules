import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './mass-id-qualifications.constants';
import { MassIDQualificationsProcessorErrors } from './mass-id-qualifications.errors';
import { ruleDefinition } from './mass-id-qualifications.rule-definition';

export const MASS_ID_QUALIFICATIONS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new MassIDQualificationsProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.DOCUMENT_SUBTYPE_NOT_FOUND': { defaultOwner: 'INTEGRATOR' },
    'ERROR.DOCUMENT_TYPE_NOT_FOUND': { defaultOwner: 'INTEGRATOR' },
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.INVALID_CATEGORY': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_MEASUREMENT_UNIT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_SUBTYPE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_TYPE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_VALUE': { defaultOwner: 'INTEGRATOR' },
  },
);
