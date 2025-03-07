import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ProjectSizeProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_EVENTS:
      'Recycler homologation document does not contain events',
    HOMOLOGATION_DOCUMENT_DOES_NOT_CONTAIN_PROJECT_SIZE:
      'Recycler homologation document does not contain project size',
    HOMOLOGATION_DOCUMENT_NOT_FOUND: 'Recycler homologation document not found',
    REJECTED_BY_ERROR: 'Unable to check recycler homologation project size',
  } as const;
}
