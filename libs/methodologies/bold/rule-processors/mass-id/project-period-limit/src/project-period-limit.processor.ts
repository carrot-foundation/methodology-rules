import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { isRecycledEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { UTCDate } from '@date-fns/utc';
import { isAfter, isEqual } from 'date-fns';

import { RESULT_COMMENTS } from './project-period-limit.constants';
import { PROJECT_PERIOD_LIMIT_FINDINGS } from './project-period-limit.findings';

interface RuleSubject {
  recycledEvent: BoldDocumentEvent | undefined;
}

export class ProjectPeriodLimitProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected evaluateResult({
    recycledEvent,
  }: RuleSubject): EvaluateResultOutput {
    const eligibleDate = this.getEligibleDate();

    if (isNil(recycledEvent)) {
      return {
        ...PROJECT_PERIOD_LIMIT_FINDINGS.result(
          'FAILED.MISSING_RECYCLED_EVENT',
        ),
        resultStatus: 'FAILED',
      };
    }

    const eventDateUTC = new UTCDate(recycledEvent.externalCreatedAt);
    const isEligible =
      isAfter(eventDateUTC, eligibleDate) ||
      isEqual(eventDateUTC, eligibleDate);

    if (isEligible) {
      return {
        resultComment: RESULT_COMMENTS.passed.VALID_RECYCLED_EVENT_DATE,
        resultStatus: 'PASSED',
      };
    }

    return {
      ...PROJECT_PERIOD_LIMIT_FINDINGS.result(
        'FAILED.INVALID_RECYCLED_EVENT_DATE',
      ),
      resultStatus: 'FAILED',
    };
  }

  protected getEligibleDate(): Date {
    return new UTCDate(new Date().getUTCFullYear() - 1, 0, 1);
  }

  protected getRuleSubject(document: BoldDocument): RuleSubject {
    const recycledEvent = document.externalEvents?.find(isRecycledEvent);

    if (isNil(recycledEvent)) {
      return { recycledEvent: undefined };
    }

    return { recycledEvent };
  }
}
