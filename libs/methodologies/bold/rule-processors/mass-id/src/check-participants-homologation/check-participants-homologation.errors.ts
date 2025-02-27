import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class CheckParticipantsHomologationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    HOMOLOGATION_DOCUMENTS_NOT_FOUND: 'Homologation documents were not found',
    HOMOLOGATION_EXPIRED: (documentIds: string[]) =>
      `These homologations have expired: ${documentIds.join(', ')}`,
    MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS: (documentId: string) =>
      `MassID ${documentId} does not contain events`,
    MASS_ID_DOCUMENT_NOT_FOUND: 'Mass document not found',
    MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS: (participantNames: string[]) =>
      `No homologation documents were found for these participants: ${participantNames.join(', ')}`,
    REJECTED_BY_ERROR: 'Unable to check participants homologation',
  } as const;
}
