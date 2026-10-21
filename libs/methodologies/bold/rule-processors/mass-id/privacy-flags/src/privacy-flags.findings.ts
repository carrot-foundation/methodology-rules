import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './privacy-flags.constants';
import { ruleDefinition } from './privacy-flags.rule-definition';

export const PRIVACY_FLAGS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  { REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired },
  {
    'REVIEW_REQUIRED.ACTOR_IS_PUBLIC': { defaultOwner: 'INTEGRATOR' },
    'REVIEW_REQUIRED.ATTRIBUTE_IS_PUBLIC': { defaultOwner: 'INTEGRATOR' },
    'REVIEW_REQUIRED.ATTRIBUTE_SENSITIVE': { defaultOwner: 'INTEGRATOR' },
    'REVIEW_REQUIRED.EVENT_IS_PUBLIC': { defaultOwner: 'INTEGRATOR' },
    'REVIEW_REQUIRED.EVENT_PRESERVE_SENSITIVE_DATA': {
      defaultOwner: 'INTEGRATOR',
    },
    'REVIEW_REQUIRED.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING': {
      defaultOwner: 'INTEGRATOR',
    },
  },
);
