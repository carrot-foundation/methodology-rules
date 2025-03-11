import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENT } from './recycler-actor.processor';

const { RECYCLER } = MethodologyDocumentEventLabel;

export const recyclerActorProcessorTestCases = [
  {
    events: [stubActorEventWithLabel('ANY_LABEL')],
    resultComment: RESULT_COMMENT.NO_RECYCLER_ACTOR_EVENT,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `no ${RECYCLER} actor event found`,
  },
  {
    events: [stubActorEventWithLabel(RECYCLER)],
    resultComment: RESULT_COMMENT.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `found ${RECYCLER} actor event`,
  },
  {
    events: [
      stubActorEventWithLabel(RECYCLER),
      stubActorEventWithLabel(RECYCLER),
    ],
    resultComment: RESULT_COMMENT.MULTIPLE_RECYCLER_ACTOR_EVENTS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `found multiple ${RECYCLER} actor events`,
  },
];
