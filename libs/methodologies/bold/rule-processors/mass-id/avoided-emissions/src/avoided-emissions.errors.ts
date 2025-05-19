import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class AvoidedEmissionsProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    MISSING_MASS_ID_DOCUMENT: 'The "MassID" document was not found.',
    MISSING_RECYCLER_HOMOLOGATION_DOCUMENT:
      'The "Recycler homologation" document was not found.',
    REJECTED_BY_ERROR: 'Unable to validate the avoided-emissions process.',
  } as const;
}
