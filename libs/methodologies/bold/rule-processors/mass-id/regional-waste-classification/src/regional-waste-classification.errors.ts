import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class RegionalWasteClassificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the regional-waste-classification.',
  } as const;
}
