import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    ACCREDITATION_DOCUMENTS_NOT_FOUND: 'Accreditation documents were not found',
    FAILED_BY_ERROR:
      'Unable to check participant accreditations-and-verifications requirements',
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS: (documentId: string) =>
      `MassID ${documentId} does not contain events`,
    MASS_ID_DOCUMENT_NOT_FOUND: 'Mass document not found',
    MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS: (
      participantNames: string[],
    ) =>
      `No valid accreditation found for these participants: ${participantNames.join(', ')}`,
    MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT: (
      participantId: string,
      actorType: string,
    ) =>
      `Multiple valid accreditations found for ${actorType} participant ${participantId}`,
  } as const;
}
