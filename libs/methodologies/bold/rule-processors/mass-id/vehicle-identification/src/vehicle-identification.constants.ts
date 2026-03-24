export const RESULT_COMMENTS = {
  failed: {
    INVALID_LICENSE_PLATE_FORMAT: `In the "Pick-up" event, the "Vehicle License Plate" format is invalid.`,
    INVALID_VEHICLE_TYPE: (vehicleType: string) =>
      `In the "Pick-up" event, the "Vehicle Type" "${vehicleType}" is not supported by the methodology.`,
    LICENSE_PLATE_MISSING: (vehicleType: string) =>
      `In the "Pick-up" event, the "Vehicle Type" is "${vehicleType}", which requires a "Vehicle License Plate", but none was provided.`,
    PICK_UP_EVENT_MISSING: `Expected "Pick-up" event to be declared.`,
    VEHICLE_DESCRIPTION_MISSING: (vehicleType: string) =>
      `In the "Pick-up" event, the "Vehicle Type" is "${vehicleType}", which requires a "Vehicle Description", but none was provided.`,
    VEHICLE_TYPE_MISSING: `In the "Pick-up" event, the "Vehicle Type" was not provided.`,
  },
  passed: {
    VEHICLE_IDENTIFIED_WITH_DESCRIPTION: (vehicleType: string) =>
      `A "Vehicle License Plate" is not required for "${vehicleType}", and the "Vehicle Description" was provided.`,
    VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE: `In the "Pick-up" event, a valid "Vehicle Type" and correctly formatted "Vehicle License Plate" were provided.`,
    VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE: (vehicleType: string) =>
      `In the "Pick-up" event, the "Vehicle Type" is "${vehicleType}", which does not require a "Vehicle License Plate".`,
  },
  reviewRequired: {},
} as const;
