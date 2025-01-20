import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  and,
  eventHasRecyclerActor,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

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

    const { MOVE } = MethodologyDocumentEventName;
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
