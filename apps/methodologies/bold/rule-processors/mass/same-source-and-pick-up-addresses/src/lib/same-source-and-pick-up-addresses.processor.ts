import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  isActorEventWithSourceActorType,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/types';
import { isNil } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface RuleSubject {
  evaluateEvent?: DocumentEvent | undefined;
  sourceActorEvent?: DocumentEvent | undefined;
}

export class SameSourceAndPickUpAddressesProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private ResultComments = {
    DO_NOT_MATCH: 'Source and pick-up addresses do not match',
    NO_SOURCE_ACTOR_EVENT: 'No actor event with source actor type found',
    RULE_NOT_APPLICABLE:
      'Rule not applicable: No move event with pick-up move type found',
  };

  protected override evaluateResult({
    evaluateEvent,
    sourceActorEvent,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(evaluateEvent)) {
      return {
        resultComment: this.ResultComments.RULE_NOT_APPLICABLE,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    if (!sourceActorEvent) {
      return {
        resultComment: this.ResultComments.NO_SOURCE_ACTOR_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const resultStatus =
      evaluateEvent.address.id === sourceActorEvent.address.id
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment: this.ResultComments.DO_NOT_MATCH,
      }),
    };
  }

  protected override getRuleSubject(
    document: Document,
  ): RuleSubject | undefined {
    const { MOVE_TYPE } = DocumentEventAttributeName;
    const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

    const evaluateEvent = document.externalEvents?.find(
      metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
    );

    const sourceActorEvent = document.externalEvents?.find(
      isActorEventWithSourceActorType,
    );

    return {
      evaluateEvent,
      sourceActorEvent,
    };
  }
}
