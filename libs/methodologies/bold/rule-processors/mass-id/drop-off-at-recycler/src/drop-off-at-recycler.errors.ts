import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class DropOffAtRecyclerProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the drop-off-at-recycler process.',
  } as const;
}
