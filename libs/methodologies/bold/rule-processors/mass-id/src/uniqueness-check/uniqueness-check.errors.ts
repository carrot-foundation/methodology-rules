import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { DROP_OFF, PICK_UP } = DocumentEventName;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;

export class UniquenessCheckProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MASS_ID_DOCUMENT_NOT_FOUND: 'MassID document not found.',
    MISSING_DROP_OFF_EVENT: `Expected "${DROP_OFF}" event.`,
    MISSING_PICK_UP_EVENT: `Expected "${PICK_UP}" event.`,
    MISSING_RECYCLER_EVENT: `Expected "${RECYCLER}" event.`,
    MISSING_VEHICLE_LICENSE_PLATE: `Expected "${VEHICLE_LICENSE_PLATE}" attribute.`,
    MISSING_WASTE_GENERATOR_EVENT: `Expected "${WASTE_GENERATOR}" event.`,
    REJECTED_BY_ERROR: 'Unable to validate the MassID uniqueness.',
  } as const;
}
