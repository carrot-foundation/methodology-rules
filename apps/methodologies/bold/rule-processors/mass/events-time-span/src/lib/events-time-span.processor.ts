import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  eventHasMetadataAttribute,
  eventNameIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { isNil } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { type SetRequiredNonNullable } from '@carrot-fndn/shared/types';
import { differenceInDays, parseISO } from 'date-fns';

const { END } = DocumentEventName;
const { MOVE_TYPE } = DocumentEventAttributeName;
const { DROP_OFF } = DocumentEventMoveType;

type Subject = {
  endEvent: SetRequiredNonNullable<DocumentEvent, 'externalCreatedAt'>;
  openEvent: SetRequiredNonNullable<DocumentEvent, 'externalCreatedAt'>;
};

export class EventsTimeSpanProcessor extends ParentDocumentRuleProcessor<Subject> {
  private ResultComment = {
    APPROVED:
      'The difference in days between externalCreatedAt of the event with DROP_OFF value and the END event is between 60 and 120',
    NOT_APPLICABLE:
      'Rule not applicable: The event with DROP_OFF value or END event with externalCreatedAt was not found',
    REJECTED:
      'The difference in days between externalCreatedAt of the event with DROP_OFF value and the END event is not between 60 and 120',
  };

  protected override evaluateResult({
    endEvent,
    openEvent,
  }: Subject): EvaluateResultOutput {
    const difference = differenceInDays(
      parseISO(endEvent.externalCreatedAt),
      parseISO(openEvent.externalCreatedAt),
    );

    const resultStatus =
      difference >= 60 && difference <= 120
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.ResultComment.APPROVED
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return this.ResultComment.NOT_APPLICABLE;
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const eventWithDropOffValue = document.externalEvents?.find((event) =>
      eventHasMetadataAttribute({
        event,
        metadataName: MOVE_TYPE,
        metadataValues: [DROP_OFF],
      }),
    );
    const endEvent = document.externalEvents?.find(eventNameIsAnyOf([END]));

    if (
      isNil(eventWithDropOffValue?.externalCreatedAt) ||
      isNil(endEvent?.externalCreatedAt)
    ) {
      return undefined;
    }

    return {
      endEvent: {
        ...endEvent,
        externalCreatedAt: endEvent.externalCreatedAt,
      },
      openEvent: {
        ...eventWithDropOffValue,
        externalCreatedAt: eventWithDropOffValue.externalCreatedAt,
      },
    };
  }
}
