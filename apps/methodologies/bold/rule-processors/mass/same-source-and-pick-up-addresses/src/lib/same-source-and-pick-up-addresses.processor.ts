import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  isActorEventWithSourceActorType,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNonEmptyArray, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class SameSourceAndPickUpAddressesProcessor extends RuleDataProcessor {
  static resultComments = {
    doNotMatch: 'Source and pick-up addresses do not match',
    noSourceActorEvent: 'No actor event with source actor type found',
    ruleNotApplicable:
      'Rule not applicable: No move event with pick-up move type found',
  };

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      });
    }

    const { MOVE, OPEN } = DocumentEventName;
    const { MOVE_TYPE } = DocumentEventAttributeName;
    const { PICK_UP } = DocumentEventMoveType;

    const openOrMoveEvents = document.externalEvents?.filter(
      and(
        eventNameIsAnyOf([OPEN, MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP]),
      ),
    );

    if (!isNonEmptyArray(openOrMoveEvents)) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment:
          SameSourceAndPickUpAddressesProcessor.resultComments
            .ruleNotApplicable,
      });
    }

    const sourceActorEvent = document.externalEvents?.find(
      isActorEventWithSourceActorType,
    );

    if (!sourceActorEvent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment:
          SameSourceAndPickUpAddressesProcessor.resultComments
            .noSourceActorEvent,
      });
    }

    const resultStatus = openOrMoveEvents.every(
      (event) => event.address.id === sourceActorEvent.address.id,
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus, {
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment:
          SameSourceAndPickUpAddressesProcessor.resultComments.doNotMatch,
      }),
    });
  }
}
