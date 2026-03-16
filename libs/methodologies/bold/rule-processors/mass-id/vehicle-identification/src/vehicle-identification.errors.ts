import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class VehicleIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the vehicle-identification process.',
  } as const;
}
