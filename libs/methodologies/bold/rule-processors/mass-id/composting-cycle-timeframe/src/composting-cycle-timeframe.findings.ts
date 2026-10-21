import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './composting-cycle-timeframe.constants';
import { CompostingCycleTimeframeProcessorErrors } from './composting-cycle-timeframe.errors';
import { ruleDefinition } from './composting-cycle-timeframe.rule-definition';

export const COMPOSTING_CYCLE_TIMEFRAME_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new CompostingCycleTimeframeProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.MISSING_DROP_OFF_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_RECYCLED_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.TIMEFRAME_OUT_OF_RANGE': { defaultOwner: 'INTEGRATOR' },
  },
);
