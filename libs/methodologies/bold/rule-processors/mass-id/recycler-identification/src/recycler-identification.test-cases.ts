import { stubActorEventWithLabel } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENT } from './recycler-identification.processor';

const { RECYCLER } = MethodologyDocumentEventLabel;
const { ACTOR } = DocumentEventName;

export const recyclerIdentificationTestCases = [
  {
    events: new Map([[`${ACTOR}-${RECYCLER}`, undefined]]),
    resultComment: RESULT_COMMENT.NOT_FOUND,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `no ${RECYCLER} actor event found`,
  },
  {
    events: new Map([
      [`${ACTOR}-${RECYCLER}`, stubActorEventWithLabel(RECYCLER)],
    ]),
    resultComment: RESULT_COMMENT.SINGLE_EVENT,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: `found ${RECYCLER} actor event`,
  },
  {
    events: new Map([
      [`${ACTOR}-${RECYCLER}-1`, stubActorEventWithLabel(RECYCLER)],
      [`${ACTOR}-${RECYCLER}-2`, stubActorEventWithLabel(RECYCLER)],
    ]),
    resultComment: RESULT_COMMENT.MULTIPLE_EVENTS,
    resultStatus: RuleOutputStatus.FAILED,
    scenario: `found multiple ${RECYCLER} actor events`,
  },
];
