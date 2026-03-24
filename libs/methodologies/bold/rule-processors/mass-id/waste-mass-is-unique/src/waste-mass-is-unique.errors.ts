import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export class WasteMassIsUniqueProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    FAILED_BY_ERROR: 'Unable to validate that waste mass is unique.',
    MASS_ID_DOCUMENT_NOT_FOUND: 'MassID document not found.',
    MISSING_DROP_OFF_EVENT: `Expected "${DocumentEventName['Drop-off']}" event.`,
    MISSING_PICK_UP_EVENT: `Expected "${DocumentEventName['Pick-up']}" event.`,
    MISSING_RECYCLER_EVENT: `Expected "${MassIDDocumentActorType.Recycler}" event.`,
    MISSING_VEHICLE_LICENSE_PLATE: `Expected "${DocumentEventAttributeName['Vehicle License Plate']}" attribute.`,
    MISSING_WASTE_GENERATOR_EVENT: `Expected "${MassIDDocumentActorType['Waste Generator']}" event.`,
  } as const;
}
