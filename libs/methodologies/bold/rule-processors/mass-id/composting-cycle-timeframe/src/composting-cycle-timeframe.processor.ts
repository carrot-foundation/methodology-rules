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

const { DROP_OFF, RECYCLED } = DocumentEventName;

type Subject = {
  dropOffEvent?: DocumentEvent | undefined;
  recycledEvent?: DocumentEvent | undefined;
};

export class CompostingCycleTimeframeProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return {
      FAILED: (dateDiff: number) =>
        `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, wich is outside the valid range (60-180 days).`,
      MISSING_DROP_OFF_EVENT: `Unable to verify the timeframe because the "${DROP_OFF}" event is missing.`,
      MISSING_RECYCLED_EVENT: `Unable to verify the timeframe because the "${RECYCLED}" event is missing.`,
      PASSED: (dateDiff: number) =>
        `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, within the valid range (60-180 days).`,
    } as const;
  }

  protected override evaluateResult({
    dropOffEvent,
    recycledEvent,
  }: Subject): EvaluateResultOutput {
    const dropOffDate = dropOffEvent?.externalCreatedAt;
    const recycledDate = recycledEvent?.externalCreatedAt;

    if (isNil(dropOffDate)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_DROP_OFF_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (isNil(recycledDate)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_RECYCLED_EVENT,
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
          ? this.RESULT_COMMENT.PASSED(difference)
          : this.RESULT_COMMENT.FAILED(difference),
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
