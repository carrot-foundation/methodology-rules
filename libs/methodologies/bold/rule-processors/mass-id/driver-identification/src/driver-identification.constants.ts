import {
  BoldAttributeName,
  BoldDocumentEventName,
  BoldVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = BoldAttributeName;
const { PICK_UP } = BoldDocumentEventName;
const { SLUDGE_PIPES } = BoldVehicleType;

export const RESULT_COMMENTS = {
  failed: {
    DRIVER_AND_JUSTIFICATION_PROVIDED: `In the "${PICK_UP}" event, both the "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" and "${DRIVER_IDENTIFIER}" were provided, but only one is allowed.`,
    MISSING_JUSTIFICATION: (vehicleType: string) =>
      `In the "${PICK_UP}" event, the vehicle "${vehicleType}" requires either a "${DRIVER_IDENTIFIER}" or an "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}".`,
  },
  passed: {
    DRIVER_IDENTIFIER: `In the "${PICK_UP}" event, the "${DRIVER_IDENTIFIER}" was provided.`,
    JUSTIFICATION_PROVIDED: (justification: string) =>
      `In the "${PICK_UP}" event, the "${DRIVER_IDENTIFIER}" was not provided, but a "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" was declared: ${justification}.`,
    SLUDGE_PIPES: `In the "${PICK_UP}" event, the "${VEHICLE_TYPE}" is "${SLUDGE_PIPES}", so driver identification is not required.`,
  },
  reviewRequired: {},
} as const;
