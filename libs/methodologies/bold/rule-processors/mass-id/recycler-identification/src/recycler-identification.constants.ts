import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

export const RESULT_COMMENTS = {
  failed: {
    MULTIPLE_EVENTS: `More than one "${ACTOR}" event with the label "${RECYCLER}" was found. Only one is allowed.`,
    NOT_FOUND: `No "${ACTOR}" event with the label "${RECYCLER}" was found.`,
  },
  passed: {
    SINGLE_EVENT: `A single "${ACTOR}" event with the label "${RECYCLER}" was found.`,
  },
  reviewRequired: {},
} as const;
