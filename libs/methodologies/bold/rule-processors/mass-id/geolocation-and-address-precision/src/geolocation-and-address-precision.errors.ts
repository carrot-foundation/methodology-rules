import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export class GeolocationAndAddressPrecisionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the geolocation-and-address-precision.',
    MASS_ID_AUDIT_DOCUMENT_NOT_FOUND: `MassID Audit document not found.`,
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS: (documentId: string) =>
      `Expected "${DocumentEventName['Drop-off']}" and "${DocumentEventName['Pick-up']}" events in the MassID document ${documentId}.`,
    MASS_ID_DOCUMENT_NOT_FOUND: `MassID document not found.`,
    PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND: `Participant Accreditation documents not found.`,
  } as const;
}
