import {
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.processor';

const { RECYCLER } = MethodologyDocumentEventLabel;
const { ACTOR, DROP_OFF } = DocumentEventName;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

const sameRecyclerAndDropOffAddress = stubAddress();

export const dropOffAtRecyclerTestCases = [
  {
    events: { [DROP_OFF]: undefined },
    resultComment: RESULT_COMMENTS.MISSING_DROP_OFF_EVENT,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document has no ${DROP_OFF} event`,
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent({
        metadataAttributes: [[RECEIVING_OPERATOR_IDENTIFIER, undefined]],
      }),
    },
    resultComment: RESULT_COMMENTS.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document has a ${DROP_OFF} event but no ${RECEIVING_OPERATOR_IDENTIFIER} attribute`,
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent(),
    },
    resultComment: RESULT_COMMENTS.ADDRESS_MISMATCH,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `the MassID document has a ${DROP_OFF} event, but the ${RECYCLER} event address does not match the ${DROP_OFF} event address`,
  },
  {
    events: {
      [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
        address: sameRecyclerAndDropOffAddress,
        label: RECYCLER,
        name: ACTOR,
      }),
      [DROP_OFF]: stubBoldMassIDDropOffEvent({
        partialDocumentEvent: {
          address: sameRecyclerAndDropOffAddress,
        },
      }),
    },
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `the MassID document has a ${DROP_OFF} event and a ${RECYCLER} event, and the ${DROP_OFF} event address matches the ${RECYCLER} event address`,
  },
];
