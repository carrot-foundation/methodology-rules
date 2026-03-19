import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  DocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;

export const RESULT_COMMENTS = {
  failed: {
    INVALID_LICENSE_PLATE_FORMAT: `In the "${PICK_UP}" event, the "${VEHICLE_LICENSE_PLATE}" format is invalid.`,
    INVALID_VEHICLE_TYPE: (vehicleType: string) =>
      `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" "${vehicleType}" is not supported by the methodology.`,
    LICENSE_PLATE_MISSING: (vehicleType: string) =>
      `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" is "${vehicleType}", which requires a "${VEHICLE_LICENSE_PLATE}", but none was provided.`,
    PICK_UP_EVENT_MISSING: `Expected "${PICK_UP}" event to be declared.`,
    VEHICLE_DESCRIPTION_MISSING: (vehicleType: string) =>
      `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" is "${vehicleType}", which requires a "${VEHICLE_DESCRIPTION}", but none was provided.`,
    VEHICLE_TYPE_MISSING: `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" was not provided.`,
  },
  passed: {
    VEHICLE_IDENTIFIED_WITH_DESCRIPTION: (vehicleType: string) =>
      `A "${VEHICLE_LICENSE_PLATE}" is not required for "${vehicleType}", and the "${VEHICLE_DESCRIPTION}" was provided.`,
    VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE: `In the "${PICK_UP}" event, a valid "${VEHICLE_TYPE}" and correctly formatted "${VEHICLE_LICENSE_PLATE}" were provided.`,
    VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE: (vehicleType: string) =>
      `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" is "${vehicleType}", which does not require a "${VEHICLE_LICENSE_PLATE}".`,
  },
  reviewRequired: {},
} as const;
