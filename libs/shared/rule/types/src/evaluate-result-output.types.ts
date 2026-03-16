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
  resultStatus: RuleOutputStatus.FAILED;
}

interface PassedResult extends BaseResult {
  resultStatus: RuleOutputStatus.PASSED;
}

interface ReviewRequiredResult extends BaseResult {
  resultStatus: RuleOutputStatus.REVIEW_REQUIRED;
}
