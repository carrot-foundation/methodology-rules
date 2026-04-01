import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  BoldAttributeName,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, PICK_UP } = BoldDocumentEventName;
const { VEHICLE_LICENSE_PLATE } = BoldAttributeName;
const { RECYCLER, WASTE_GENERATOR } = BoldDocumentEventLabel;

export class WasteMassIsUniqueProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate that waste mass is unique.',
    MASS_ID_DOCUMENT_NOT_FOUND: 'MassID document not found.',
    MISSING_DROP_OFF_EVENT: `Expected "${DROP_OFF}" event.`,
    MISSING_PICK_UP_EVENT: `Expected "${PICK_UP}" event.`,
    MISSING_RECYCLER_EVENT: `Expected "${RECYCLER}" event.`,
    MISSING_VEHICLE_LICENSE_PLATE: `Expected "${VEHICLE_LICENSE_PLATE}" attribute.`,
    MISSING_WASTE_GENERATOR_EVENT: `Expected "${WASTE_GENERATOR}" event.`,
  } as const;
}
