export const RESULT_COMMENTS = {
  failed: {
    HAULER_EVENT_MISSING: (vehicleType: string) =>
      `No "ACTOR" event with the label "Hauler" was found, but it is required for the "${vehicleType}" Pick-up "Vehicle Type".`,
    PICK_UP_EVENT_MISSING: `No "Pick-up" event was found in the document.`,
  },
  passed: {
    HAULER_EVENT_FOUND: `An "ACTOR" with the label "Hauler" was found.`,
    HAULER_NOT_REQUIRED: (vehicleType: string) =>
      `A "Hauler" ACTOR event is not required because the Pick-up "Vehicle Type" is ${vehicleType}.`,
  },
  reviewRequired: {},
} as const;
