import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENT } from './processor-identification.processor';

const { PROCESSOR } = MethodologyDocumentEventLabel;
const { ACTOR } = DocumentEventName;

export const processorIdentificationTestCases = [
  {
    events: new Map([[`${ACTOR}-${PROCESSOR}`, undefined]]),
    resultComment: RESULT_COMMENT.NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `no ${PROCESSOR} actor event found`,
  },
  {
    events: new Map([
      [`${ACTOR}-${PROCESSOR}`, stubActorEventWithLabel(PROCESSOR)],
    ]),
    resultComment: RESULT_COMMENT.SINGLE_EVENT,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `found ${PROCESSOR} actor event`,
  },
  {
    events: new Map([
      [`${ACTOR}-${PROCESSOR}-1`, stubActorEventWithLabel(PROCESSOR)],
      [`${ACTOR}-${PROCESSOR}-2`, stubActorEventWithLabel(PROCESSOR)],
    ]),
    resultComment: RESULT_COMMENT.MULTIPLE_EVENTS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `found multiple ${PROCESSOR} actor events`,
  },
];
