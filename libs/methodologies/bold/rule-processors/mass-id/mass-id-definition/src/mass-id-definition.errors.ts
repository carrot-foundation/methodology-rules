import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class MassIdDefinitionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_SUBTYPE_NOT_FOUND: 'Document subtype not found.',
    DOCUMENT_TYPE_NOT_FOUND: 'Document type not found.',
    FAILED_BY_ERROR: 'Unable to validate the mass definition.',
  } as const;
}
