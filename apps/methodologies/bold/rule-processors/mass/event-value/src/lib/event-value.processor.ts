import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import { metadataAttributeNameIsAnyOf } from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { EVENT_VALUE } = DocumentEventAttributeName;

type Subject = {
  currentValue: number;
  event: DocumentEvent;
};

export class EventValueProcessor extends ParentDocumentRuleProcessor<Subject> {
  private ResultComment = {
    APPROVED: `The event has the ${EVENT_VALUE} attribute value equal to currentValue of document`,
    NOT_APPLICABLE: `Rule not applicable: The event with ${EVENT_VALUE} attribute was not found`,
    REJECTED: `The event has the ${EVENT_VALUE} attribute value different to currentValue of document`,
  };

  protected override evaluateResult({
    currentValue,
    event,
  }: Subject): EvaluateResultOutput {
    const resultStatus =
      getEventAttributeValue(event, EVENT_VALUE) === currentValue
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
    const event = document.externalEvents?.find(
      metadataAttributeNameIsAnyOf([EVENT_VALUE]),
    );

    if (event) {
      return {
        currentValue: document.currentValue,
        event,
      };
    }

    return undefined;
  }
}
