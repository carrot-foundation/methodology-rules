import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  and,
  eventHasNonEmptyStringAttribute,
  metadataAttributeNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
  not,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventVehicleType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;
const { MOVE_TYPE, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  DocumentEventAttributeName;
const { BICYCLE, CART, SLUDGE_PIPES } = DocumentEventVehicleType;

export class VehicleLicensePlateProcessor extends ParentDocumentRuleProcessor<DocumentEvent> {
  private ResultComment = {
    APPROVED: 'The vehicle-license-plate attribute is a non-empty string',
    NOT_APPLICABLE:
      'Rule not applicable: An event with attribute move-type with Pick-up value and vehicle-type with a value not in [Sludge Pipes, Cart, Bicycle] was not found',
    REJECTED: 'The vehicle-license-plate attribute is not a non-empty string',
  };

  protected override evaluateResult(
    event: DocumentEvent,
  ): EvaluateResultOutput {
    const resultStatus = eventHasNonEmptyStringAttribute(
      event,
      VEHICLE_LICENSE_PLATE,
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
    const findEventCondition = and(
      metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
      metadataAttributeNameIsAnyOf([VEHICLE_TYPE]),
      not(
        metadataAttributeValueIsAnyOf(VEHICLE_TYPE, [
          BICYCLE,
          CART,
          SLUDGE_PIPES,
        ]),
      ),
    );

    return document.externalEvents?.find(findEventCondition);
  }
}
