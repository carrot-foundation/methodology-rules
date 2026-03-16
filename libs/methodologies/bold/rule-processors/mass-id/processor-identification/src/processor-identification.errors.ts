import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ProcessorIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the processor-identification process.',
  } as const;
}
