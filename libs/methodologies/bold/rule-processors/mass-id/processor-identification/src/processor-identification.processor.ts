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
const { PROCESSOR } = MethodologyDocumentEventLabel;

type Subject = {
  processorActorEvents?: DocumentEvent[] | undefined;
};

export const RESULT_COMMENT = {
  MULTIPLE_EVENTS: `More than one "${ACTOR}" event with the label "${PROCESSOR}" was found. Only one is allowed.`,
  NOT_FOUND: `No "${ACTOR}" event with the label "${PROCESSOR}" was found.`,
  SINGLE_EVENT: `A single "${ACTOR}" event with the label "${PROCESSOR}" was found.`,
} as const;

export class ProcessorIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENT;
  }

  protected override evaluateResult({
    processorActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(processorActorEvents)) {
      return {
        resultComment: this.RESULT_COMMENT.NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (processorActorEvents.length > 1) {
      return {
        resultComment: this.RESULT_COMMENT.MULTIPLE_EVENTS,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.SINGLE_EVENT,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const processorActorEvents = document.externalEvents?.filter(
      (event) => eventHasLabel(event, PROCESSOR) && eventHasName(event, ACTOR),
    );

    return {
      processorActorEvents,
    };
  }
}
