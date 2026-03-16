import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class RecyclerIdentificationProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the recycler-identification process.',
  } as const;
}
