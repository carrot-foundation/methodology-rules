import { GeolocationPrecisionRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';

export class PickUpGeolocationPrecisionProcessor extends GeolocationPrecisionRuleProcessor {
  protected moveTypeValues = [
    DocumentEventMoveType.PICK_UP,
    DocumentEventMoveType.SHIPMENT_REQUEST,
  ];

  protected participantHomologationSubtype = DocumentSubtype.SOURCE;
}
