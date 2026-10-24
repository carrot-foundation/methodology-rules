import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import {
  stubAddress,
  stubBoldMassIDDropOffEvent,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import { inspect } from 'node:util';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

interface DropOffAtRecyclerTestCase extends RuleTestCase {
  events: Record<string, ReturnType<typeof stubDocumentEvent> | undefined>;
}

const { RECYCLER } = BoldDocumentEventLabel;
const { ACTOR, DROP_OFF } = BoldDocumentEventName;
const { RECEIVING_OPERATOR_IDENTIFIER } = BoldAttributeName;

const sameRecyclerAndDropOffAddress = stubAddress();

export const dropOffAtRecyclerTestCases: DropOffAtRecyclerTestCase[] = [
  {
    events: { [DROP_OFF]: undefined },
    manifestExample: true,
    resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
    resultStatus: 'FAILED',
    scenario: `The MassID document has no "${DROP_OFF}" event`,
  },
  ...[
    undefined,
    null,
    '',
    '   ',
    false,
    true,
    {},
    [],
    Number.NaN,
    Infinity,
    -Infinity,
  ].map(
    (identifier): DropOffAtRecyclerTestCase => ({
      events: {
        [DROP_OFF]: stubBoldMassIDDropOffEvent({
          metadataAttributes: [[RECEIVING_OPERATOR_IDENTIFIER, identifier]],
        }),
      },
      manifestExample: identifier === undefined,
      resultComment:
        RESULT_COMMENTS.failed.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
      resultStatus: 'FAILED',
      scenario: `The MassID document has a "${DROP_OFF}" event with an invalid "${RECEIVING_OPERATOR_IDENTIFIER}" attribute: ${inspect(identifier)}`,
    }),
  ),
  {
    events: {
      [DROP_OFF]: stubBoldMassIDDropOffEvent(),
    },
    resultComment: RESULT_COMMENTS.failed.ADDRESS_MISMATCH,
    resultStatus: 'FAILED',
    scenario: `The MassID document has a "${DROP_OFF}" event, but the "${RECYCLER}" event address does not match the "${DROP_OFF}" event address`,
  },
  ...[faker.string.uuid(), faker.number.int({ min: 1 }), 0, -1, 0.5].map(
    (identifier): DropOffAtRecyclerTestCase => ({
      events: {
        [`${ACTOR}-${RECYCLER}`]: stubDocumentEvent({
          address: sameRecyclerAndDropOffAddress,
          label: RECYCLER,
          name: ACTOR,
        }),
        [DROP_OFF]: stubBoldMassIDDropOffEvent({
          metadataAttributes: [[RECEIVING_OPERATOR_IDENTIFIER, identifier]],
          partialDocumentEvent: {
            address: sameRecyclerAndDropOffAddress,
          },
        }),
      },
      manifestExample: typeof identifier === 'string',
      manifestFields: { addressFields: ['latitude', 'longitude'] },
      resultComment: RESULT_COMMENTS.passed.VALID_DROP_OFF,
      resultStatus: 'PASSED',
      scenario: `The MassID document has a "${DROP_OFF}" event and a "${RECYCLER}" event, and the "${DROP_OFF}" event address matches the "${RECYCLER}" event address with operator identifier ${identifier}`,
    }),
  ),
];
