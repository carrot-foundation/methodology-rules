import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class WasteMassIsUniqueProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate that waste mass is unique.',
    MASS_ID_DOCUMENT_NOT_FOUND: 'MassID document not found.',
    MISSING_DROP_OFF_EVENT: `Expected "Drop-off" event.`,
    MISSING_PICK_UP_EVENT: `Expected "Pick-up" event.`,
    MISSING_RECYCLER_EVENT: `Expected "Recycler" event.`,
    MISSING_VEHICLE_LICENSE_PLATE: `Expected "Vehicle License Plate" attribute.`,
    MISSING_WASTE_GENERATOR_EVENT: `Expected "Waste Generator" event.`,
  } as const;
}
