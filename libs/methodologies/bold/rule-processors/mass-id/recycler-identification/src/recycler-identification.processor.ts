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
  MULTIPLE_EVENTS: `More than one "${ACTOR}" event with the label "${RECYCLER}" was found. Only one is allowed.`,
  NOT_FOUND: `No "${ACTOR}" event with the label "${RECYCLER}" was found.`,
  SINGLE_EVENT: `A single "${ACTOR}" event with the label "${RECYCLER}" was found.`,
} as const;

export class RecyclerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENT;
  }

  protected override evaluateResult({
    recyclerActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(recyclerActorEvents)) {
      return {
        resultComment: this.RESULT_COMMENT.NOT_FOUND,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (recyclerActorEvents.length > 1) {
      return {
        resultComment: this.RESULT_COMMENT.MULTIPLE_EVENTS,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.SINGLE_EVENT,
      resultStatus: RuleOutputStatus.PASSED,
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
