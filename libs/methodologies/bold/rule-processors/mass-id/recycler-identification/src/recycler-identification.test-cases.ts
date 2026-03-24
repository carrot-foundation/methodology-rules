import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './recycler-identification.constants';

interface RecyclerIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubActorEventWithLabel> | undefined>;
}

export const recyclerIdentificationTestCases: RecyclerIdentificationTestCase[] =
  [
    {
      events: new Map([['ACTOR-Recycler', undefined]]),
      resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID document has no "Recycler" actor event',
    },
    {
      events: new Map([
        ['ACTOR-Recycler', stubActorEventWithLabel('Recycler')],
      ]),
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED',
      scenario: 'The MassID document has a "Recycler" actor event',
    },
    {
      events: new Map([
        ['ACTOR-Recycler-1', stubActorEventWithLabel('Recycler')],
        ['ACTOR-Recycler-2', stubActorEventWithLabel('Recycler')],
      ]),
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
      resultStatus: 'FAILED',
      scenario: 'The MassID document has multiple "Recycler" actor events',
    },
  ];
