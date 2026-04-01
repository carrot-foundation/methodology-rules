import {
  DocumentEventAttributeName,
  DocumentEventLabel,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

const { DROP_OFF } = DocumentEventName;
const { RECYCLER } = DocumentEventLabel;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  failed: {
    ADDRESS_MISMATCH: `The "${DROP_OFF}" event address does not match the "${RECYCLER}" ACTOR event address.`,
    MISSING_DROP_OFF_EVENT: `No "${DROP_OFF}" event was found in the document.`,
    MISSING_RECEIVING_OPERATOR_IDENTIFIER: `The "${DROP_OFF}" event must include a "${RECEIVING_OPERATOR_IDENTIFIER}", but none was provided.`,
  },
  passed: {
    VALID_DROP_OFF: `The "${DROP_OFF}" event was recorded with a valid "${RECEIVING_OPERATOR_IDENTIFIER}", and its address matches the "${RECYCLER}" ACTOR event address.`,
  },
  reviewRequired: {},
} as const;
