import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentCategory,
  DocumentEventName,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export class GeolocationAndAddressPrecisionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the geolocation-and-address-precision.',
    MASS_ID_AUDIT_DOCUMENT_NOT_FOUND: `${DocumentType['MassID Audit']} document not found.`,
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS: (documentId: string) =>
      `Expected "${DocumentEventName['Drop-off']}" and "${DocumentEventName['Pick-up']}" events in the ${DocumentCategory.MassID} document ${documentId}.`,
    MASS_ID_DOCUMENT_NOT_FOUND: `${DocumentCategory.MassID} document not found.`,
    PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND: `${DocumentType['Participant Accreditation']} documents not found.`,
  } as const;
}
