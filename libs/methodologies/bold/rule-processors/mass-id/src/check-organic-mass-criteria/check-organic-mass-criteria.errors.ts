import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class CheckOrganicMassCriteriaProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_SUBTYPE_NOT_FOUND: 'Document subtype not found',
    DOCUMENT_TYPE_NOT_FOUND: 'Document type not found',
    REJECTED_BY_ERROR: 'Unable to validate if the organic mass criteria is met',
  } as const;
}
