import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF, PICK_UP } = DocumentEventName;

export const RESULT_COMMENTS = {
  failed: {
    DISTANCE_CALCULATION_FAILED: `Unable to calculate the distance between the first "${PICK_UP}" and last "${DROP_OFF}".`,
    MISSING_DROP_OFF_EVENT: `No "${DROP_OFF}" event was found in the document.`,
    MISSING_PICK_UP_EVENT: `No "${PICK_UP}" event was found in the document.`,
  },
  passed: {
    SUCCESS: (distance: number) =>
      `The distance between the first "${PICK_UP}" and last "${DROP_OFF}" is ${distance}km.`,
  },
  reviewRequired: {},
} as const;
