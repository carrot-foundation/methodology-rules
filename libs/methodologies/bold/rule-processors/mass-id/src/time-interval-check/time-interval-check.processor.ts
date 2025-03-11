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

export class TimeIntervalCheckProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return {
      APPROVED: (dateDiff: number) =>
        `The difference in days between the event ${DROP_OFF} and the ${RECYCLED} event is between 60 and 180: ${dateDiff}.`,
      MISSING_DROP_OFF_EVENT: `The ${DROP_OFF} event was not found.`,
      MISSING_RECYCLED_EVENT: `The ${RECYCLED} event was not found.`,
      REJECTED: (dateDiff: number) =>
        `The difference in days between the event ${DROP_OFF} and the ${RECYCLED} event is not between 60 and 180: ${dateDiff}.`,
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
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(recycledDate)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_RECYCLED_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const difference = differenceInDays(
      parseISO(recycledDate),
      parseISO(dropOffDate),
    );

    const resultStatus =
      difference >= 60 && difference <= 180
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.RESULT_COMMENT.APPROVED(difference)
          : this.RESULT_COMMENT.REJECTED(difference),
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
