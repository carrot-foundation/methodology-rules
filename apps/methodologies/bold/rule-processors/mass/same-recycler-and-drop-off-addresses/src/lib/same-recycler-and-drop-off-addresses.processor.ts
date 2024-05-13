import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventHasRecyclerActor,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class SameRecyclerAndDropOffAddressesProcessor extends RuleDataProcessor {
  static resultComment = {
    addressDoesNotMatch:
      'In the MOVE event, the address does not match that of the Recycler.',
    addressMatches:
      'In the MOVE event, the address matches that of the Recycler.',
    moveTypeEventNotFound: 'Move Type event not found',
    recyclerActorEventNotFound: 'Recycler Actor event not found',
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

    const { externalEvents } = document;

    const actorRecyclerEvent = externalEvents?.find(eventHasRecyclerActor);

    if (!actorRecyclerEvent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment:
          SameRecyclerAndDropOffAddressesProcessor.resultComment
            .recyclerActorEventNotFound,
      });
    }

    const { MOVE } = DocumentEventName;
    const { DROP_OFF } = DocumentEventMoveType;
    const { MOVE_TYPE } = DocumentEventAttributeName;

    const moveTypeDropOffEvent = externalEvents?.find(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [DROP_OFF]),
      ),
    );

    if (!moveTypeDropOffEvent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED, {
        resultComment:
          SameRecyclerAndDropOffAddressesProcessor.resultComment
            .moveTypeEventNotFound,
      });
    }

    const sameAddressesId =
      actorRecyclerEvent.address.id === moveTypeDropOffEvent.address.id;

    return mapToRuleOutput(
      ruleInput,
      sameAddressesId ? RuleOutputStatus.APPROVED : RuleOutputStatus.REJECTED,
      {
        resultComment: sameAddressesId
          ? SameRecyclerAndDropOffAddressesProcessor.resultComment
              .addressMatches
          : SameRecyclerAndDropOffAddressesProcessor.resultComment
              .addressDoesNotMatch,
      },
    );
  }
}
