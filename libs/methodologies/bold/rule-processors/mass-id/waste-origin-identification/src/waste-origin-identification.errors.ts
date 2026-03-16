import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class WasteOriginIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the waste-origin-identification process.',
  } as const;
}
