import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class UniquenessCheckProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_TYPE_NOT_FOUND: 'Document type not found.',
    REJECTED_BY_ERROR: 'Unable to validate the uniqueness-check.',
  } as const;
}
