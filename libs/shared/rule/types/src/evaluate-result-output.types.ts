import type { AnyObject } from '@carrot-fndn/shared/types';

import type { RuleOutputStatus } from './rule.types';

export type EvaluateResultOutput =
  | FailedResult
  | PassedResult
  | ReviewRequiredResult;

interface BaseResult {
  resultComment: string;
  resultContent?: AnyObject;
}

interface FailedResult extends BaseResult {
  resultStatus: typeof RuleOutputStatus.FAILED;
}

interface PassedResult extends BaseResult {
  resultStatus: typeof RuleOutputStatus.PASSED;
}

interface ReviewRequiredResult extends BaseResult {
  resultStatus: typeof RuleOutputStatus.REVIEW_REQUIRED;
}
