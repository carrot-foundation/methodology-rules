import {
  BoldDocumentEventName,
  BoldUnidentifiedAttributeValue,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { ACTOR, PICK_UP, WASTE_GENERATOR } = BoldDocumentEventName;
const { UNIDENTIFIED } = BoldUnidentifiedAttributeValue;

export const RESULT_COMMENTS = {
  failed: {
    MISSING_PICK_UP_EVENT: `The "${PICK_UP}" event was not found.`,
    MISSING_WASTE_GENERATOR_EVENT: `No "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, and the waste origin is not "${UNIDENTIFIED}".`,
    MULTIPLE_WASTE_GENERATOR_EVENTS: `More than one "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, but only one is allowed.`,
    WASTE_ORIGIN_CONFLICT: `An "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, but the waste origin is "${UNIDENTIFIED}".`,
  },
  passed: {
    UNIDENTIFIED_WASTE_ORIGIN: `No "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, and the waste origin is "${UNIDENTIFIED}".`,
    WASTE_ORIGIN_IDENTIFIED: `A single "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found.`,
  },
  reviewRequired: {},
} as const;
