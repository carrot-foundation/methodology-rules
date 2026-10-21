import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './regional-waste-classification.constants';
import { RegionalWasteClassificationProcessorErrors } from './regional-waste-classification.errors';
import { ruleDefinition } from './regional-waste-classification.rule-definition';

export const REGIONAL_WASTE_CLASSIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new RegionalWasteClassificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.CLASSIFICATION_DESCRIPTION_MISSING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.CLASSIFICATION_ID_MISSING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_CLASSIFICATION_DESCRIPTION': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_CLASSIFICATION_ID': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_SUBTYPE_CDM_CODE_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'FAILED.INVALID_SUBTYPE_MAPPING': { defaultOwner: 'INTEGRATOR' },
    'FAILED.UNSUPPORTED_COUNTRY': { defaultOwner: 'CARROT' },
  },
);
