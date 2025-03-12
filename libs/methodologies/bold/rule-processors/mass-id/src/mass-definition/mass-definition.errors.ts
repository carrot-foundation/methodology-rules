import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class MassDefinitionProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_SUBTYPE_NOT_FOUND: 'Document subtype not found.',
    DOCUMENT_TYPE_NOT_FOUND: 'Document type not found.',
    REJECTED_BY_ERROR: 'Unable to validate the mass definition.',
  } as const;
}
