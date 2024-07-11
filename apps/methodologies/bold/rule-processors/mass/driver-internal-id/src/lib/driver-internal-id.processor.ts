import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  and,
  metadataAttributeValueIsAnyOf,
  metadataAttributeValueIsNotEmpty,
  not,
} from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DriverInternalIdProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  private ResultComment = {
    REJECTED: 'Driver internal id is missing for a non-sludge pipes move',
  };

  protected override evaluateResult(
    externalEvents: DocumentEvent[],
  ): EvaluateResultOutput {
    const resultStatus = externalEvents.every(
      and(
        not(
          metadataAttributeValueIsAnyOf(
            DocumentEventAttributeName.VEHICLE_TYPE,
            [DocumentEventVehicleType.SLUDGE_PIPES],
          ),
        ),
        metadataAttributeValueIsNotEmpty(
          DocumentEventAttributeName.DRIVER_INTERNAL_ID,
        ),
      ),
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? undefined
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getRuleSubject({
    externalEvents,
  }: Document): DocumentEvent[] | undefined {
    const { MOVE_TYPE } = DocumentEventAttributeName;
    const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

    return externalEvents?.filter(
      metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
    );
  }
}
