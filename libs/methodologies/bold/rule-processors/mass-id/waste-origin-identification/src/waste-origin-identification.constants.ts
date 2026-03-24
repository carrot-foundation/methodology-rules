export const RESULT_COMMENTS = {
  failed: {
    MISSING_PICK_UP_EVENT: `The "Pick-up" event was not found.`,
    MISSING_WASTE_GENERATOR_EVENT: `No "ACTOR" event with the label "Waste Generator" was found, and the waste origin is not "Unidentified".`,
    MULTIPLE_WASTE_GENERATOR_EVENTS: `More than one "ACTOR" event with the label "Waste Generator" was found, but only one is allowed.`,
    WASTE_ORIGIN_CONFLICT: `An "ACTOR" event with the label "Waste Generator" was found, but the waste origin is "Unidentified".`,
  },
  passed: {
    UNIDENTIFIED_WASTE_ORIGIN: `No "ACTOR" event with the label "Waste Generator" was found, and the waste origin is "Unidentified".`,
    WASTE_ORIGIN_IDENTIFIED: `A single "ACTOR" event with the label "Waste Generator" was found.`,
  },
  reviewRequired: {},
} as const;
