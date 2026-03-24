import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';

import { RESULT_COMMENTS } from './processor-identification.constants';

interface ProcessorIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubActorEventWithLabel> | undefined>;
}

export const processorIdentificationTestCases: ProcessorIdentificationTestCase[] =
  [
    {
      events: new Map([['ACTOR-Processor', undefined]]),
      resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
      resultStatus: 'FAILED',
      scenario: 'The MassID document has no "Processor" actor event',
    },
    {
      events: new Map([
        ['ACTOR-Processor', stubActorEventWithLabel('Processor')],
      ]),
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED',
      scenario: 'The MassID document has a "Processor" actor event',
    },
    {
      events: new Map([
        ['ACTOR-Processor-1', stubActorEventWithLabel('Processor')],
        ['ACTOR-Processor-2', stubActorEventWithLabel('Processor')],
      ]),
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
      resultStatus: 'FAILED',
      scenario: 'The MassID document has multiple "Processor" actor events',
    },
  ];
