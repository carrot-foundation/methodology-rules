import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class CheckParticipantsHomologationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    HOMOLOGATION_DOCUMENTS_NOT_FOUND: 'Homologation documents were not found',
    HOMOLOGATION_EXPIRED: (documentIds: string[]) =>
      `These homologation documents has expired: ${documentIds.join(', ')}`,
    MASS_DOCUMENT_DOES_NOT_CONTAIN_EVENTS: (documentId: string) =>
      `Mass document ${documentId} does not contain events`,
    MASS_DOCUMENT_NOT_FOUND: 'Mass document not found',
    MISSING_PARTICIPANTS_HOMOLOGATION_DOCUMENTS: (participantIds: string[]) =>
      `These participants documents are missing from the homologation: ${participantIds.join(', ')}`,
    REJECTED_BY_ERROR: 'Unable to check participants homologation',
  } as const;
}
