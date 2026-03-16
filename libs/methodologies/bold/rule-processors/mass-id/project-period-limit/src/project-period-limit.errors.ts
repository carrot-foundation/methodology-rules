import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ProjectPeriodLimitProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the project-period-limit process.',
  } as const;
}
