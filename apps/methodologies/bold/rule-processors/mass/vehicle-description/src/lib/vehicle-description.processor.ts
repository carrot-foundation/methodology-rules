import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  and,
  eventHasNonEmptyStringAttribute,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;
const { OTHERS } = DocumentEventVehicleType;
const { MOVE_TYPE, VEHICLE_DESCRIPTION, VEHICLE_TYPE } =
  DocumentEventAttributeName;

export class VehicleDescriptionProcessor extends ParentDocumentRuleProcessor<DocumentEvent> {
  private ResultComment = {
    APPROVED: 'The vehicle-description attribute is a non-empty string',
    NOT_APPLICABLE:
      'Rule not applicable: The OPEN or MOVE event with attribute move-type with a value equal to Pick-up and vehicle-type with a value equal to Others was not found',
    REJECTED: 'The vehicle-description attribute is not a non-empty string',
  };

  protected override evaluateResult(
    event: DocumentEvent,
  ): EvaluateResultOutput {
    const resultStatus = eventHasNonEmptyStringAttribute(
      event,
      VEHICLE_DESCRIPTION,
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
  ): DocumentEvent | undefined {
    return document.externalEvents?.find(
      and(
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
        metadataAttributeValueIsAnyOf(VEHICLE_TYPE, [OTHERS]),
      ),
    );
  }
}
