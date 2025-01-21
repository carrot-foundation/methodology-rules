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
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { MOVE } = DocumentEventName;
const { DROP_OFF } = DocumentEventMoveType;
const { MOVE_TYPE } = DocumentEventAttributeName;

type RuleSubject = DocumentEvent[];

export class DropOffMoveProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private ResultComment = {
    APPROVED:
      'The MOVE event with a move-type attribute with a Drop-off value was found',
    REJECTED:
      'The MOVE event with a move-type attribute with a Drop-off value was not found',
  };

  protected override evaluateResult(events: RuleSubject): EvaluateResultOutput {
    const dropOffEvent = events.find(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [DROP_OFF]),
      ),
    );

    const resultStatus =
      dropOffEvent === undefined
        ? RuleOutputStatus.REJECTED
        : RuleOutputStatus.APPROVED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.ResultComment.APPROVED
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getRuleSubject(
    document: Document,
  ): RuleSubject | undefined {
    return document.externalEvents;
  }
}
