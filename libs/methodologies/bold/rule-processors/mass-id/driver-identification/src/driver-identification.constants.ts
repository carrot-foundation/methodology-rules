import {
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const RESULT_COMMENTS = {
  failed: {
    DRIVER_AND_JUSTIFICATION_PROVIDED: `In the "${DocumentEventName['Pick-up']}" event, both the "${DocumentEventAttributeName['Driver Identifier Exemption Justification']}" and "${DocumentEventAttributeName['Driver Identifier']}" were provided, but only one is allowed.`,
    MISSING_JUSTIFICATION: (vehicleType: string) =>
      `In the "${DocumentEventName['Pick-up']}" event, the vehicle "${vehicleType}" requires either a "${DocumentEventAttributeName['Driver Identifier']}" or an "${DocumentEventAttributeName['Driver Identifier Exemption Justification']}".`,
  },
  passed: {
    DRIVER_IDENTIFIER: `In the "${DocumentEventName['Pick-up']}" event, the "${DocumentEventAttributeName['Driver Identifier']}" was provided.`,
    JUSTIFICATION_PROVIDED: (justification: string) =>
      `In the "${DocumentEventName['Pick-up']}" event, the "${DocumentEventAttributeName['Driver Identifier']}" was not provided, but a "${DocumentEventAttributeName['Driver Identifier Exemption Justification']}" was declared: ${justification}.`,
    SLUDGE_PIPES: `In the "${DocumentEventName['Pick-up']}" event, the "${DocumentEventAttributeName['Vehicle Type']}" is "${DocumentEventVehicleType['Sludge Pipes']}", so driver identification is not required.`,
  },
  reviewRequired: {},
} as const;
