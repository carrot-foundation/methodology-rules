import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, RECYCLED } = DocumentEventName;

export const RESULT_COMMENTS = {
  failed: {
    MISSING_DROP_OFF_EVENT: `Unable to verify the timeframe because the "${DROP_OFF}" event is missing.`,
    MISSING_RECYCLED_EVENT: `Unable to verify the timeframe because the "${RECYCLED}" event is missing.`,
    TIMEFRAME_OUT_OF_RANGE: (dateDiff: number) =>
      `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, which is outside the valid range (60-180 days).`,
  },
  passed: {
    TIMEFRAME_WITHIN_RANGE: (dateDiff: number) =>
      `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, within the valid range (60-180 days).`,
  },
  reviewRequired: {},
} as const;
