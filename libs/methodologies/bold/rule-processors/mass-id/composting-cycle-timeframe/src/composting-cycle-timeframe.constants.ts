import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, RECYCLED } = DocumentEventName;

export const COMPOSTING_CYCLE_MAX_DAYS = 180;
export const COMPOSTING_CYCLE_MIN_DAYS = 60;
export const HOURS_PER_DAY = 24;

/**
 * Tolerance applied to the min/max boundary comparison to account for
 * timestamp jitter from integrators (e.g. events logged a few seconds
 * after midnight instead of exactly at midnight).
 */
export const TOLERANCE_IN_HOURS = 1;

export const RESULT_COMMENTS = {
  failed: {
    MISSING_DROP_OFF_EVENT: `Unable to verify the timeframe because the "${DROP_OFF}" event is missing.`,
    MISSING_RECYCLED_EVENT: `Unable to verify the timeframe because the "${RECYCLED}" event is missing.`,
    TIMEFRAME_OUT_OF_RANGE: (dateDiff: number) =>
      `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, which is outside the valid range (${COMPOSTING_CYCLE_MIN_DAYS}-${COMPOSTING_CYCLE_MAX_DAYS} days).`,
  },
  passed: {
    TIMEFRAME_WITHIN_RANGE: (dateDiff: number) =>
      `The time between the "${DROP_OFF}" and "${RECYCLED}" events is ${dateDiff} days, within the valid range (${COMPOSTING_CYCLE_MIN_DAYS}-${COMPOSTING_CYCLE_MAX_DAYS} days).`,
  },
  reviewRequired: {},
} as const;
