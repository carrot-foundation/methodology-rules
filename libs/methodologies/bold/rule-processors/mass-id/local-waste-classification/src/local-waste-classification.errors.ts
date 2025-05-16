import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class LocalWasteClassificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    REJECTED_BY_ERROR: 'Unable to validate the local-waste-classification.',
  } as const;
}
