export const RESULT_COMMENTS = {
  failed: {
    INVALID_RECYCLED_EVENT_DATE: `The "Recycled" event occurred before the first day of the previous year, in UTC time.`,
    MISSING_RECYCLED_EVENT: `No "Recycled" event was found in the document.`,
  },
  passed: {
    VALID_RECYCLED_EVENT_DATE: `The "Recycled" event occurred on or after the first day of the previous year, in UTC time.`,
  },
  reviewRequired: {},
} as const;
