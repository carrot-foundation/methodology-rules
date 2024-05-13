import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeNameIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { END } = DocumentEventName;
const { EVENT_VALUE } = DocumentEventAttributeName;

type Subject = {
  currentValue: number;
  events: Array<DocumentEvent>;
};

export class EndEventValueProcessor extends ParentDocumentRuleProcessor<Subject> {
  private ResultComment = {
    APPROVED:
      'The END event has the event-value attribute value equal to currentValue of document',
    NOT_APPLICABLE:
      'Rule not applicable: The END event with event-value attribute was not found',
    REJECTED:
      'The END event has the event-value attribute value different to currentValue of document',
  };

  protected override evaluateResult({
    currentValue,
    events,
  }: Subject): EvaluateResultOutput {
    const resultStatus = events.every(
      (event) => getEventAttributeValue(event, EVENT_VALUE) === currentValue,
    )
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
    const events = document.externalEvents?.filter(
      and(eventNameIsAnyOf([END]), metadataAttributeNameIsAnyOf([EVENT_VALUE])),
    );

    if (events) {
      return {
        currentValue: document.currentValue,
        events,
      };
    }

    return undefined;
  }
}
