import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { isRecycledEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { UTCDate } from '@date-fns/utc';
import { isAfter, isEqual } from 'date-fns';

interface RuleSubject {
  recycledEvent: DocumentEvent | undefined;
}

const { RECYCLED } = DocumentEventName;

export const RESULT_COMMENTS = {
  INVALID_RECYCLED_EVENT_DATE: `The "${RECYCLED}" event occurred before the first day of the previous year, in UTC time.`,
  MISSING_RECYCLED_EVENT: `No "${RECYCLED}" event was found in the document.`,
  VALID_RECYCLED_EVENT_DATE: `The "${RECYCLED}" event occurred on or after the first day of the previous year, in UTC time.`,
} as const;

export class ProjectPeriodLimitProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected evaluateResult({
    recycledEvent,
  }: RuleSubject): EvaluateResultOutput {
    const eligibleDate = this.getEligibleDate();

    if (isNil(recycledEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_RECYCLED_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const eventDateUTC = new UTCDate(recycledEvent.externalCreatedAt);
    const isEligible =
      isAfter(eventDateUTC, eligibleDate) ||
      isEqual(eventDateUTC, eligibleDate);

    return {
      resultComment: isEligible
        ? RESULT_COMMENTS.VALID_RECYCLED_EVENT_DATE
        : RESULT_COMMENTS.INVALID_RECYCLED_EVENT_DATE,
      resultStatus: isEligible
        ? RuleOutputStatus.PASSED
        : RuleOutputStatus.FAILED,
    };
  }

  protected getEligibleDate(): Date {
    return new UTCDate(new Date().getUTCFullYear() - 1, 0, 1);
  }

  protected getRuleSubject(document: Document): RuleSubject {
    const recycledEvent = document.externalEvents?.find(isRecycledEvent);

    if (isNil(recycledEvent)) {
      return { recycledEvent: undefined };
    }

    return { recycledEvent };
  }
}
