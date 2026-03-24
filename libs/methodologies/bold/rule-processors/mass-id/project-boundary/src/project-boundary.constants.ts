export const RESULT_COMMENTS = {
  failed: {
    DISTANCE_CALCULATION_FAILED: `Unable to calculate the distance between the first "Pick-up" and last "Drop-off".`,
    MISSING_DROP_OFF_EVENT: `No "Drop-off" event was found in the document.`,
    MISSING_PICK_UP_EVENT: `No "Pick-up" event was found in the document.`,
  },
  passed: {
    SUCCESS: (distance: number) =>
      `The distance between the first "Pick-up" and last "Drop-off" is ${distance} km.`,
  },
  reviewRequired: {},
} as const;
