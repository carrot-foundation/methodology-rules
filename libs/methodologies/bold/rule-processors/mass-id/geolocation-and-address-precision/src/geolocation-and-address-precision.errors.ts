import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, PICK_UP } = DocumentEventName;
const { MASS_ID } = DocumentCategory;
const { MASS_ID_AUDIT, PARTICIPANT_ACCREDITATION } = DocumentType;

export class GeolocationAndAddressPrecisionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the geolocation-and-address-precision.',
    MASS_ID_AUDIT_DOCUMENT_NOT_FOUND: `${MASS_ID_AUDIT} document not found.`,
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS: (documentId: string) =>
      `Expected "${DROP_OFF}" and "${PICK_UP}" events in the ${MASS_ID} document ${documentId}.`,
    MASS_ID_DOCUMENT_NOT_FOUND: `${MASS_ID} document not found.`,
    PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND: `${PARTICIPANT_ACCREDITATION} documents not found.`,
  } as const;
}
