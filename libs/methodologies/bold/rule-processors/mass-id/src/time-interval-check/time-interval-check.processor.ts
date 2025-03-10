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
import { type SetRequiredNonNullable } from '@carrot-fndn/shared/types';
import { differenceInDays, parseISO } from 'date-fns';

const { DROP_OFF, RECYCLED } = DocumentEventName;

type Subject = {
  dropOffEvent: SetRequiredNonNullable<DocumentEvent, 'externalCreatedAt'>;
  recycledEvent: SetRequiredNonNullable<DocumentEvent, 'externalCreatedAt'>;
};

export class TimeIntervalCheckProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return {
      APPROVED: `The difference in days between externalCreatedAt of the event ${DROP_OFF} and the ${RECYCLED} event is between 60 and 180`,
      NOT_APPLICABLE: `Rule not applicable: The event ${DROP_OFF} or ${RECYCLED} event with externalCreatedAt was not found`,
      REJECTED: `The difference in days between externalCreatedAt of the event ${DROP_OFF} and the ${RECYCLED} event is not between 60 and 180`,
    } as const;
  }

  protected override evaluateResult({
    dropOffEvent,
    recycledEvent,
  }: Subject): EvaluateResultOutput {
    const difference = differenceInDays(
      parseISO(recycledEvent.externalCreatedAt),
      parseISO(dropOffEvent.externalCreatedAt),
    );

    const resultStatus =
      difference >= 60 && difference <= 180
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.RESULT_COMMENT.APPROVED
          : this.RESULT_COMMENT.REJECTED,
      resultStatus,
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return this.RESULT_COMMENT.NOT_APPLICABLE;
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const dropOffEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DROP_OFF]),
    );
    const recycledEvent = document.externalEvents?.find(
      eventNameIsAnyOf([RECYCLED]),
    );

    if (
      isNil(dropOffEvent?.externalCreatedAt) ||
      isNil(recycledEvent?.externalCreatedAt)
    ) {
      return undefined;
    }

    return {
      dropOffEvent: {
        ...dropOffEvent,
        externalCreatedAt: dropOffEvent.externalCreatedAt,
      },
      recycledEvent: {
        ...recycledEvent,
        externalCreatedAt: recycledEvent.externalCreatedAt,
      },
    };
  }
}
