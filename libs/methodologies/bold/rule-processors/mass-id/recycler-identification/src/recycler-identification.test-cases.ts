import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventLabel,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './recycler-identification.constants';

const { RECYCLER } = DocumentEventLabel;
const { ACTOR } = DocumentEventName;

interface RecyclerIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubActorEventWithLabel> | undefined>;
}

export const recyclerIdentificationTestCases: RecyclerIdentificationTestCase[] =
  [
    {
      events: new Map([[`${ACTOR}-${RECYCLER}`, undefined]]),
      resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: `The MassID document has no "${RECYCLER}" actor event`,
    },
    {
      events: new Map([
        [`${ACTOR}-${RECYCLER}`, stubActorEventWithLabel(RECYCLER)],
      ]),
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED',
      scenario: `The MassID document has a "${RECYCLER}" actor event`,
    },
    {
      events: new Map([
        [`${ACTOR}-${RECYCLER}-1`, stubActorEventWithLabel(RECYCLER)],
        [`${ACTOR}-${RECYCLER}-2`, stubActorEventWithLabel(RECYCLER)],
      ]),
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
      resultStatus: 'FAILED',
      scenario: `The MassID document has multiple "${RECYCLER}" actor events`,
    },
  ];
