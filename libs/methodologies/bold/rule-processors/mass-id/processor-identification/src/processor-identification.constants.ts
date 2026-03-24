export const RESULT_COMMENTS = {
  failed: {
    MULTIPLE_EVENTS: `More than one "ACTOR" event with the label "Processor" was found. Only one is allowed.`,
    NOT_FOUND: `No "ACTOR" event with the label "Processor" was found.`,
  },
  passed: {
    SINGLE_EVENT: `A single "ACTOR" event with the label "Processor" was found.`,
  },
  reviewRequired: {},
} as const;
