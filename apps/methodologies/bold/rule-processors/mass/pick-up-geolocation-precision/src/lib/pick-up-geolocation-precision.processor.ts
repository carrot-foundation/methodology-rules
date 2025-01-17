import { GeolocationPrecisionRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export class PickUpGeolocationPrecisionProcessor extends GeolocationPrecisionRuleProcessor {
  protected moveTypeValues = [
    DocumentEventMoveType.PICK_UP,
    DocumentEventMoveType.SHIPMENT_REQUEST,
  ];

  protected participantHomologationSubtype = DocumentSubtype.SOURCE;
}
