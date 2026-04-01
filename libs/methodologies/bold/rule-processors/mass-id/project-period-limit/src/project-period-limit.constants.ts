import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { RECYCLED } = BoldDocumentEventName;

export const RESULT_COMMENTS = {
  failed: {
    INVALID_RECYCLED_EVENT_DATE: `The "${RECYCLED}" event occurred before the first day of the previous year, in UTC time.`,
    MISSING_RECYCLED_EVENT: `No "${RECYCLED}" event was found in the document.`,
  },
  passed: {
    VALID_RECYCLED_EVENT_DATE: `The "${RECYCLED}" event occurred on or after the first day of the previous year, in UTC time.`,
  },
  reviewRequired: {},
} as const;
