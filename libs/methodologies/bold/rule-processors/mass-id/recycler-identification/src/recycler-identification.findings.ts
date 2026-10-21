import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './recycler-identification.constants';
import { RecyclerIdentificationProcessorErrors } from './recycler-identification.errors';
import { ruleDefinition } from './recycler-identification.rule-definition';

export const RECYCLER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new RecyclerIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.MULTIPLE_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'FAILED.NOT_FOUND': { defaultOwner: 'INTEGRATOR' },
  },
);
