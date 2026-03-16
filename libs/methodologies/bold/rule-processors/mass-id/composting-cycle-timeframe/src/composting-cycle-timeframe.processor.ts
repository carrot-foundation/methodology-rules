import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { differenceInDays, parseISO } from 'date-fns';

import { RESULT_COMMENTS } from './composting-cycle-timeframe.constants';

const { DROP_OFF, RECYCLED } = DocumentEventName;

type Subject = {
  dropOffEvent?: DocumentEvent | undefined;
  recycledEvent?: DocumentEvent | undefined;
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
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (isNil(recycledDate)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_RECYCLED_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const difference = differenceInDays(
      parseISO(recycledDate),
      parseISO(dropOffDate),
    );

    const resultStatus =
      difference >= 60 && difference <= 180
        ? RuleOutputStatus.PASSED
        : RuleOutputStatus.FAILED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.PASSED
          ? RESULT_COMMENTS.passed.TIMEFRAME_WITHIN_RANGE(difference)
          : RESULT_COMMENTS.failed.TIMEFRAME_OUT_OF_RANGE(difference),
      resultStatus,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
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
