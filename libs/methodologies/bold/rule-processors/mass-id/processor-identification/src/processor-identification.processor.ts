import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  eventHasLabel,
  eventHasName,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './processor-identification.constants';

const { ACTOR } = DocumentEventName;
const { PROCESSOR } = DocumentEventLabel;

type Subject = {
  processorActorEvents?: BoldDocumentEvent[] | undefined;
};

export class ProcessorIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    processorActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(processorActorEvents)) {
      return {
        resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
        resultStatus: 'FAILED',
      };
    }

    if (processorActorEvents.length > 1) {
      return {
        resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
        resultStatus: 'FAILED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(document: BoldDocument): Subject | undefined {
    const processorActorEvents = document.externalEvents?.filter(
      (event) => eventHasLabel(event, PROCESSOR) && eventHasName(event, ACTOR),
    );

    return {
      processorActorEvents,
    };
  }
}
