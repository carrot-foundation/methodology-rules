import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

interface DropOffAtRecyclerTestCase extends RuleTestCase {
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

const { RECYCLER } = DocumentEventLabel;
const { ACTOR, DROP_OFF } = DocumentEventName;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

const sameRecyclerAndDropOffAddress = stubAddress();

export const dropOffAtRecyclerTestCases: DropOffAtRecyclerTestCase[] = [
  {
    events: { [DROP_OFF]: undefined },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
    resultStatus: 'FAILED',
    scenario: `The MassID document has no "${DROP_OFF}" event`,
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent({
        metadataAttributes: [[RECEIVING_OPERATOR_IDENTIFIER, undefined]],
      }),
    },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
    resultStatus: 'FAILED',
    scenario: `The MassID document has a "${DROP_OFF}" event but no "${RECEIVING_OPERATOR_IDENTIFIER}" attribute`,
  },
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent(),
    },
    resultComment: RESULT_COMMENTS.failed.ADDRESS_MISMATCH,
    resultStatus: 'FAILED',
    scenario: `The MassID document has a "${DROP_OFF}" event, but the "${RECYCLER}" event address does not match the "${DROP_OFF}" event address`,
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
    manifestExample: true,
    manifestFields: { addressFields: ['latitude', 'longitude'] },
    resultComment: RESULT_COMMENTS.passed.VALID_DROP_OFF,
    resultStatus: 'PASSED',
    scenario: `The MassID document has a "${DROP_OFF}" event and a "${RECYCLER}" event, and the "${DROP_OFF}" event address matches the "${RECYCLER}" event address`,
  },
];
