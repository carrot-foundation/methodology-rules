import { GeolocationPrecisionRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export class DropOffGeolocationPrecisionProcessor extends GeolocationPrecisionRuleProcessor {
  protected moveTypeValues = [DocumentEventMoveType.DROP_OFF];

  protected participantHomologationSubtype = DocumentSubtype.RECYCLER;
}
