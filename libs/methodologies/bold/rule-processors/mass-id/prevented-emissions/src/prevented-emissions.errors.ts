import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class PreventedEmissionsProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate the prevented-emissions process.',
    INVALID_MASS_ID_DOCUMENT_SUBTYPE:
      'The "MassID" document has an invalid subtype.',
    INVALID_WASTE_GENERATOR_BASELINES:
      'The "Waste Generator homologation" document has no valid baselines.',
    MISSING_MASS_ID_DOCUMENT: 'The "MassID" document was not found.',
    MISSING_RECYCLER_HOMOLOGATION_DOCUMENT:
      'The "Recycler homologation" document was not found.',
    MISSING_WASTE_GENERATOR_HOMOLOGATION_DOCUMENT:
      'The "Waste Generator homologation" document was not found.',
  } as const;
}
