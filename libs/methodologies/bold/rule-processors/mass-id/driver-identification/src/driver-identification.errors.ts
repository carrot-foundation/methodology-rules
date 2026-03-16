import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class DriverIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the driver-identification process.',
  } as const;
}
