import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, PICK_UP } = DocumentEventName;
const { MASS_ID } = DocumentCategory;
const { PARTICIPANT_HOMOLOGATION } = DocumentType;

export class GeolocationPrecisionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS: (documentId: string) =>
      `Expected "${DROP_OFF}" and "${PICK_UP}" events in the ${MASS_ID} document ${documentId}.`,
    MASS_ID_DOCUMENT_NOT_FOUND: `${MASS_ID} document not found.`,
    PARTICIPANT_HOMOLOGATION_DOCUMENTS_NOT_FOUND: `${PARTICIPANT_HOMOLOGATION} documents not found.`,
    REJECTED_BY_ERROR: 'Unable to validate the geolocation-precision.',
  } as const;
}
