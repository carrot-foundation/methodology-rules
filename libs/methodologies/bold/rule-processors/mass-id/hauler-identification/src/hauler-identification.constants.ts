import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  failed: {
    HAULER_EVENT_MISSING: (vehicleType: string) =>
      `No "${ACTOR}" event with the label "${HAULER}" was found, but it is required for the "${vehicleType}" pick-up "${VEHICLE_TYPE}".`,
    PICK_UP_EVENT_MISSING: `No "${PICK_UP}" event was found in the document.`,
  },
  passed: {
    HAULER_EVENT_FOUND: `An "${ACTOR}" with the label "${HAULER}" was found.`,
    HAULER_NOT_REQUIRED: (vehicleType: string) =>
      `A "${HAULER}" event is not required because the pick-up "${VEHICLE_TYPE}" is ${vehicleType}.`,
  },
  reviewRequired: {},
} as const;
