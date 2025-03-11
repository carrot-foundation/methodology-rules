import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  eventHasLabel,
  eventHasName,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

type Subject = {
  recyclerActorEvents?: DocumentEvent[] | undefined;
};

export const RESULT_COMMENT = {
  APPROVED: `The "${RECYCLER}" actor event was declared.`,
  MULTIPLE_RECYCLER_ACTOR_EVENTS: `Found multiple "${RECYCLER}" actor events.`,
  NO_RECYCLER_ACTOR_EVENT: `No "${RECYCLER}" actor event found.`,
} as const;

export class RecyclerActorProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENT;
  }

  protected override evaluateResult({
    recyclerActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(recyclerActorEvents)) {
      return {
        resultComment: this.RESULT_COMMENT.NO_RECYCLER_ACTOR_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (recyclerActorEvents.length > 1) {
      return {
        resultComment: this.RESULT_COMMENT.MULTIPLE_RECYCLER_ACTOR_EVENTS,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const recyclerActorEvents = document.externalEvents?.filter(
      (event) => eventHasLabel(event, RECYCLER) && eventHasName(event, ACTOR),
    );

    return {
      recyclerActorEvents,
    };
  }
}
