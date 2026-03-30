import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = DocumentEventLabel;
const { VEHICLE_TYPE } = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  failed: {
    HAULER_EVENT_MISSING: (vehicleType: string) =>
      `No "${ACTOR}" event with the label "${HAULER}" was found, but it is required for the "${vehicleType}" Pick-up "${VEHICLE_TYPE}".`,
    PICK_UP_EVENT_MISSING: `No "${PICK_UP}" event was found in the document.`,
  },
  passed: {
    HAULER_EVENT_FOUND: `An "${ACTOR}" with the label "${HAULER}" was found.`,
    HAULER_NOT_REQUIRED: (vehicleType: string) =>
      `A "${HAULER}" ACTOR event is not required because the Pick-up "${VEHICLE_TYPE}" is ${vehicleType}.`,
  },
  reviewRequired: {},
} as const;
