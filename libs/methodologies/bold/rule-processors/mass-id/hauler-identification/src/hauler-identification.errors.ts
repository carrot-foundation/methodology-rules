import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class HaulerIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the hauler-identification process.',
  } as const;
}
