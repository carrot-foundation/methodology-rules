import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import {
  DOCUMENT_NOT_FOUND_RESULT_COMMENT,
  calculateDistanceBetweenTwoEvents,
} from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { MAXIMUM_DISTANCE_RESULT_COMMENT } from './maximum-distance.processor.constants';

export class MaximumDistanceProcessor extends RuleDataProcessor {
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
    const { DROP_OFF, PICK_UP } = DocumentEventMoveType;

    const pickUpEvent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([OPEN, MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP]),
      ),
    );

    const dropOffEvent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [DROP_OFF]),
      ),
    );

    if (!pickUpEvent || !dropOffEvent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: pickUpEvent
          ? MAXIMUM_DISTANCE_RESULT_COMMENT.drop_off_not_found
          : MAXIMUM_DISTANCE_RESULT_COMMENT.pick_up_not_found,
      });
    }

    const resultStatus =
      calculateDistanceBetweenTwoEvents(pickUpEvent, dropOffEvent) <= 200
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
