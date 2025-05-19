import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class WeighingProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MASS_ID_DOCUMENT_NOT_FOUND: 'The MassID document was not found.',
    MISSING_RECYCLER_HOMOLOGATION_DOCUMENT:
      'The Recycler Homologation document was not found.',
    REJECTED_BY_ERROR: 'Unable to validate the weighing process.',
  } as const;
}
