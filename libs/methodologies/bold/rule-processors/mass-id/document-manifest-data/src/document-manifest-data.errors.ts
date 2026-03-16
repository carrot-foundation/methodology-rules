import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class DocumentManifestDataProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the document-manifest-data process.',
  } as const;
}
