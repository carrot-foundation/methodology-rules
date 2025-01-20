import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

import { eventHasAllNonEmptyWeightAttributes } from './weighing-fields.processor.utils';

const { MOVE } = MethodologyDocumentEventName;
const { WEIGHING } = DocumentEventMoveType;
const { MOVE_TYPE } = DocumentEventAttributeName;

export class WeighingFieldsProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  private ResultComment = {
    APPROVED:
      'The MOVE event has the move-type attribute and all weighing fields',
    NOT_APPLICABLE:
      'Rule not applicable: The MOVE event with the move-type attribute with value equal to Weighing was not found',
    REJECTED:
      'The MOVE event has the move-type attribute and does not have all weighing fields',
  };

  protected override evaluateResult(
    events: DocumentEvent[],
  ): EvaluateResultOutput {
    const resultStatus = events.every((event) =>
      eventHasAllNonEmptyWeightAttributes(event),
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

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent[] | undefined {
    return document.externalEvents?.filter(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [WEIGHING]),
      ),
    );
  }
}
