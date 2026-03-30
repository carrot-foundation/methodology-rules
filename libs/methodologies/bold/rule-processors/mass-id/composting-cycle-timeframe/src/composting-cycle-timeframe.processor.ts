import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

import {
  COMPOSTING_CYCLE_MAX_DAYS,
  COMPOSTING_CYCLE_MIN_DAYS,
  HOURS_PER_DAY,
  RESULT_COMMENTS,
  TOLERANCE_IN_HOURS,
} from './composting-cycle-timeframe.constants';

const { DROP_OFF, RECYCLED } = DocumentEventName;

type Subject = {
  dropOffEvent?: BoldDocumentEvent | undefined;
  recycledEvent?: BoldDocumentEvent | undefined;
};

export class CompostingCycleTimeframeProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    dropOffEvent,
    recycledEvent,
  }: Subject): EvaluateResultOutput {
    const dropOffDate = dropOffEvent?.externalCreatedAt;
    const recycledDate = recycledEvent?.externalCreatedAt;

    if (isNil(dropOffDate)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
        resultStatus: 'FAILED',
      };
    }

    if (isNil(recycledDate)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_RECYCLED_EVENT,
        resultStatus: 'FAILED',
      };
    }

    const parsedRecycledDate = parseISO(recycledDate);
    const parsedDropOffDate = parseISO(dropOffDate);

    const diffInHours = differenceInHours(
      parsedRecycledDate,
      parsedDropOffDate,
    );
    const difference = differenceInDays(parsedRecycledDate, parsedDropOffDate);

    const meetsMinimum =
      diffInHours >=
      COMPOSTING_CYCLE_MIN_DAYS * HOURS_PER_DAY - TOLERANCE_IN_HOURS;
    const meetsMaximum =
      diffInHours <=
      COMPOSTING_CYCLE_MAX_DAYS * HOURS_PER_DAY + TOLERANCE_IN_HOURS;

    const resultStatus = meetsMinimum && meetsMaximum ? 'PASSED' : 'FAILED';

    return {
      resultComment:
        resultStatus === 'PASSED'
          ? RESULT_COMMENTS.passed.TIMEFRAME_WITHIN_RANGE(difference)
          : RESULT_COMMENTS.failed.TIMEFRAME_OUT_OF_RANGE(difference),
      resultStatus,
    };
  }

  protected override getRuleSubject(document: BoldDocument): Subject | undefined {
    const dropOffEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DROP_OFF]),
    );
    const recycledEvent = document.externalEvents?.find(
      eventNameIsAnyOf([RECYCLED]),
    );

    return {
      dropOffEvent,
      recycledEvent,
    };
  }
}
