import { GeolocationPrecisionRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';

export class PickUpGeolocationPrecisionProcessor extends GeolocationPrecisionRuleProcessor {
  protected moveTypeValue = DocumentEventMoveType.PICK_UP;

  protected participantHomologationSubtype = DocumentSubtype.SOURCE;
}
