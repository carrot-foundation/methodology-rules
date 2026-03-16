import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ProjectBoundaryProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR:
      'Unable to validate the project-boundary process.',
  } as const;
}
