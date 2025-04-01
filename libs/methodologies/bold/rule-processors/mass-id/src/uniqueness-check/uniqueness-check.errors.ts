import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { MASS_ID } = DocumentCategory;

export class UniquenessCheckProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MASS_ID_DOCUMENT_NOT_FOUND: 'MassID document not found.',
    MISSING_DROP_OFF_EVENT: `Unable to validate the "${MASS_ID}" uniqueness because the "${DROP_OFF}" event is missing.`,
    MISSING_PICK_UP_EVENT: `Unable to validate the "${MASS_ID}" uniqueness because the "${PICK_UP}" event is missing.`,
    MISSING_RECYCLER_EVENT: `Unable to validate the "${MASS_ID}" uniqueness because the "${RECYCLER}" event is missing.`,
    MISSING_VEHICLE_LICENSE_PLATE: `Unable to validate the "${MASS_ID}" uniqueness because the vehicle license plate is missing.`,
    MISSING_WASTE_GENERATOR_EVENT: `Unable to validate the "${MASS_ID}" uniqueness because the "${WASTE_GENERATOR}" event is missing.`,
    REJECTED_BY_ERROR: 'Unable to validate the MassID uniqueness.',
  } as const;
}
