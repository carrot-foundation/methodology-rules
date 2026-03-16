import type { RuleTestCase } from '@carrot-fndn/shared/rule/types';

import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './processor-identification.constants';

const { PROCESSOR } = MethodologyDocumentEventLabel;
const { ACTOR } = DocumentEventName;

interface ProcessorIdentificationTestCase extends RuleTestCase {
  events: Map<string, ReturnType<typeof stubActorEventWithLabel> | undefined>;
}

export const processorIdentificationTestCases: ProcessorIdentificationTestCase[] =
  [
    {
      events: new Map([[`${ACTOR}-${PROCESSOR}`, undefined]]),
      resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: `no ${PROCESSOR} actor event found`,
    },
    {
      events: new Map([
        [`${ACTOR}-${PROCESSOR}`, stubActorEventWithLabel(PROCESSOR)],
      ]),
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: RuleOutputStatus.PASSED,
      scenario: `found ${PROCESSOR} actor event`,
    },
    {
      events: new Map([
        [`${ACTOR}-${PROCESSOR}-1`, stubActorEventWithLabel(PROCESSOR)],
        [`${ACTOR}-${PROCESSOR}-2`, stubActorEventWithLabel(PROCESSOR)],
      ]),
      resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
      resultStatus: RuleOutputStatus.FAILED,
      scenario: `found multiple ${PROCESSOR} actor events`,
    },
  ];
