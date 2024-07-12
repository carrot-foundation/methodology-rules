import { GeolocationPrecisionRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';

export class DropOffGeolocationPrecisionProcessor extends GeolocationPrecisionRuleProcessor {
  protected moveTypeValues = [DocumentEventMoveType.DROP_OFF];

  protected participantHomologationSubtype = DocumentSubtype.RECYCLER;
}
