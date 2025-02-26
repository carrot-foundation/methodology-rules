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
import { format, isAfter, isEqual } from 'date-fns';

interface RuleSubject {
  recycledEvent: DocumentEvent | undefined;
}

export class ProjectPeriodProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private readonly RESULT_COMMENT = {
    ELIGIBLE: (eligibleDate: Date) =>
      `The '${DocumentEventName.RECYCLED}' event was created after ${format(eligibleDate, 'yyyy-MM-dd')}.`,
    INELIGIBLE: (eligibleDate: Date) =>
      `The '${DocumentEventName.RECYCLED}' event was created before ${format(eligibleDate, 'yyyy-MM-dd')}.`,
    MISSING_RECYCLED_EVENT: `The '${DocumentEventName.RECYCLED}' event is missing.`,
    MISSING_RECYCLED_EVENT_EXTERNAL_CREATED_AT: `The '${DocumentEventName.RECYCLED}' event has no 'externalCreatedAt' attribute.`,
  } as const;

  protected evaluateResult({
    recycledEvent,
  }: RuleSubject): EvaluateResultOutput {
    const eligibleDate = this.getEligibleDate();

    if (isNil(recycledEvent)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_RECYCLED_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(recycledEvent.externalCreatedAt)) {
      return {
        resultComment:
          this.RESULT_COMMENT.MISSING_RECYCLED_EVENT_EXTERNAL_CREATED_AT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const eventDate = new Date(recycledEvent.externalCreatedAt);
    const eventDateUTC = Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
    );
    const isEligible =
      isAfter(eventDateUTC, eligibleDate) ||
      isEqual(eventDateUTC, eligibleDate);

    return {
      resultComment: isEligible
        ? this.RESULT_COMMENT.ELIGIBLE(eligibleDate)
        : this.RESULT_COMMENT.INELIGIBLE(eligibleDate),
      resultStatus: isEligible
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

  protected getEligibleDate(): Date {
    return new Date(Date.UTC(new Date().getUTCFullYear() - 1, 0, 1));
  }

  protected getRuleSubject(document: Document): RuleSubject {
    const recycledEvent = document.externalEvents?.find(isRecycledEvent);

    if (isNil(recycledEvent)) {
      return { recycledEvent: undefined };
    }

    return { recycledEvent };
  }
}
