import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './project-period-limit.constants';
import { ProjectPeriodLimitProcessorErrors } from './project-period-limit.errors';
import { ruleDefinition } from './project-period-limit.rule-definition';

export const PROJECT_PERIOD_LIMIT_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new ProjectPeriodLimitProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.INVALID_RECYCLED_EVENT_DATE': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_RECYCLED_EVENT': { defaultOwner: 'INTEGRATOR' },
  },
);
