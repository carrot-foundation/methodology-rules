import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './processor-identification.constants';
import { ProcessorIdentificationProcessorErrors } from './processor-identification.errors';
import { ruleDefinition } from './processor-identification.rule-definition';

export const PROCESSOR_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new ProcessorIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'FAILED.MULTIPLE_EVENTS': { defaultOwner: 'INTEGRATOR' },
    'FAILED.NOT_FOUND': { defaultOwner: 'INTEGRATOR' },
  },
);
