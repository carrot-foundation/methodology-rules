import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

interface DropOffAtRecyclerTestCase extends RuleTestCase {
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

const sameRecyclerAndDropOffAddress = stubAddress();

export const dropOffAtRecyclerTestCases: DropOffAtRecyclerTestCase[] = [
  {
    events: { 'Drop-off': undefined },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
    resultStatus: 'FAILED',
    scenario: 'The MassID document has no "Drop-off" event',
  },
  {
    events: {
      'Drop-off': stubBoldMassIDDropOffEvent({
        metadataAttributes: [['Receiving Operator Identifier', undefined]],
      }),
    },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
    resultStatus: 'FAILED',
    scenario:
      'The MassID document has a "Drop-off" event but no "Receiving Operator Identifier" attribute',
  },
  {
    events: {
      'Drop-off': stubBoldMassIDDropOffEvent(),
    },
    resultComment: RESULT_COMMENTS.failed.ADDRESS_MISMATCH,
    resultStatus: 'FAILED',
    scenario:
      'The MassID document has a "Drop-off" event, but the "Recycler" event address does not match the "Drop-off" event address',
  },
  {
    events: {
      'ACTOR-Recycler': stubDocumentEvent({
        address: sameRecyclerAndDropOffAddress,
        label: 'Recycler',
        name: 'ACTOR',
      }),
      'Drop-off': stubBoldMassIDDropOffEvent({
        partialDocumentEvent: {
          address: sameRecyclerAndDropOffAddress,
        },
      }),
    },
    manifestExample: true,
    manifestFields: { addressFields: ['latitude', 'longitude'] },
    resultComment: RESULT_COMMENTS.passed.VALID_DROP_OFF,
    resultStatus: 'PASSED',
    scenario:
      'The MassID document has a "Drop-off" event and a "Recycler" event, and the "Drop-off" event address matches the "Recycler" event address',
  },
];
