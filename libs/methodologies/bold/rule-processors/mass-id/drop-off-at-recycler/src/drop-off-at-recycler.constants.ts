export const RESULT_COMMENTS = {
  failed: {
    ADDRESS_MISMATCH: `The "Drop-off" event address does not match the "Recycler" ACTOR event address.`,
    MISSING_DROP_OFF_EVENT: `No "Drop-off" event was found in the document.`,
    MISSING_RECEIVING_OPERATOR_IDENTIFIER: `The "Drop-off" event must include a "Receiving Operator Identifier", but none was provided.`,
  },
  passed: {
    VALID_DROP_OFF: `The "Drop-off" event was recorded with a valid "Receiving Operator Identifier", and its address matches the "Recycler" ACTOR event address.`,
  },
  reviewRequired: {},
} as const;
