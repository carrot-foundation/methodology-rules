import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class RewardsDistributionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_DOES_NOT_CONTAIN_EVENTS: (documentId: string) =>
      `Document ${documentId} does not contain events`,
    MASS_DOCUMENTS_NOT_FOUND: 'Mass documents not found',
    METHODOLOGY_DOCUMENT_NOT_FOUND: 'Methodology document not found',
    MISSING_REQUIRED_ACTORS: (documentId: string, actorTypes: string[]) =>
      `Missing required actor types "${actorTypes.join(', ')}" in the document ${documentId}`,
    REJECTED_BY_ERROR: 'Unable to calculate rewards distribution',
    UNEXPECTED_DOCUMENT_SUBTYPE: 'Unexpected document subtype',
  } as const;
}
