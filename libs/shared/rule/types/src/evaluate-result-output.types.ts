import type { AnyObject } from '@carrot-fndn/shared/types';

import type { RuleOutputStatus } from './rule.types';

export type EvaluateResultOutput =
  | FailedResult
  | PassedResult
  | ReviewRequiredResult;

interface FailedResult {
  resultComment: string;
  resultStatus: RuleOutputStatus.FAILED;
}

interface PassedResult {
  resultComment: string;
  resultContent?: AnyObject;
  resultStatus: RuleOutputStatus.PASSED;
}

interface ReviewRequiredResult {
  resultComment: string;
  resultContent?: AnyObject;
  resultStatus: RuleOutputStatus.REVIEW_REQUIRED;
}
