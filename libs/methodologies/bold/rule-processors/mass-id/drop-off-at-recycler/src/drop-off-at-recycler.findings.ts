import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';
import { DropOffAtRecyclerProcessorErrors } from './drop-off-at-recycler.errors';
import { ruleDefinition } from './drop-off-at-recycler.rule-definition';

export const DROP_OFF_AT_RECYCLER_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new DropOffAtRecyclerProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.ADDRESS_MISMATCH': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_DROP_OFF_EVENT': { defaultOwner: 'INTEGRATOR' },
    'FAILED.MISSING_RECEIVING_OPERATOR_IDENTIFIER': {
      defaultOwner: 'INTEGRATOR',
    },
  },
);
