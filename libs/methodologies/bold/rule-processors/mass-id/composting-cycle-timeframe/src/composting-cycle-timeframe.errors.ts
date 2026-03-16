import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class CompostingCycleTimeframeProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the composting-cycle-timeframe process.',
  } as const;
}
