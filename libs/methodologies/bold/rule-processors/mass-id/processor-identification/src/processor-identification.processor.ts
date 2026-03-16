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

import { RESULT_COMMENTS } from './processor-identification.constants';

const { ACTOR } = DocumentEventName;
const { PROCESSOR } = MethodologyDocumentEventLabel;

type Subject = {
  processorActorEvents?: DocumentEvent[] | undefined;
};

export class ProcessorIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    processorActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(processorActorEvents)) {
      return {
        resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (processorActorEvents.length > 1) {
      return {
        resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: RuleOutputStatus.PASSED,
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
