import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { metadataAttributeValueIsAnyOf } from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/types';
import { calculateDistanceBetweenTwoEvents } from '@carrot-fndn/methodologies/bold/utils';
import { isNil } from '@carrot-fndn/shared/helpers';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { MOVE_TYPE } = DocumentEventAttributeName;
const { DROP_OFF, PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

interface Subject {
  dropOffEvent?: DocumentEvent | undefined;
  pickUpOrShipmentRequestEvent?: DocumentEvent | undefined;
}

export class MaximumDistanceProcessor extends ParentDocumentRuleProcessor<Subject> {
  private ResultComment = {
    DROP_OFF_NOT_FOUND:
      'Event with metadata attribute name move-type and value Drop-off was not found',
    PICK_UP_NOT_FOUND:
      'Event with metadata attribute name move-type and value Pick-up or Shipment-request was not found',
  };

  protected override evaluateResult({
    dropOffEvent,
    pickUpOrShipmentRequestEvent,
  }: Subject): EvaluateResultOutput {
    if (isNil(dropOffEvent) || isNil(pickUpOrShipmentRequestEvent)) {
      return {
        resultComment: pickUpOrShipmentRequestEvent
          ? this.ResultComment.DROP_OFF_NOT_FOUND
          : this.ResultComment.PICK_UP_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const resultStatus =
      calculateDistanceBetweenTwoEvents(
        pickUpOrShipmentRequestEvent,
        dropOffEvent,
      ) <= 200
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const pickUpOrShipmentRequestEvent = document.externalEvents?.find(
      metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
    );

    const dropOffEvent = document.externalEvents?.find(
      metadataAttributeValueIsAnyOf(MOVE_TYPE, [DROP_OFF]),
    );

    return {
      dropOffEvent,
      pickUpOrShipmentRequestEvent,
    };
  }
}
