import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENT } from './recycler-identification.processor';

const { RECYCLER } = MethodologyDocumentEventLabel;

export const recyclerIdentificationTestCases = [
  {
    events: [stubActorEventWithLabel('ANY_LABEL')],
    resultComment: RESULT_COMMENT.NOT_FOUND,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `no ${RECYCLER} actor event found`,
  },
  {
    events: [stubActorEventWithLabel(RECYCLER)],
    resultComment: RESULT_COMMENT.SINGLE_EVENT,
    resultStatus: RuleOutputStatus.APPROVED,
    scenario: `found ${RECYCLER} actor event`,
  },
  {
    events: [
      stubActorEventWithLabel(RECYCLER),
      stubActorEventWithLabel(RECYCLER),
    ],
    resultComment: RESULT_COMMENT.MULTIPLE_EVENTS,
    resultStatus: RuleOutputStatus.REJECTED,
    scenario: `found multiple ${RECYCLER} actor events`,
  },
];
