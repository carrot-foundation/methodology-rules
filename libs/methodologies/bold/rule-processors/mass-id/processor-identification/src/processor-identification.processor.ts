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
  BoldDocumentEventLabel,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './processor-identification.constants';
import { PROCESSOR_IDENTIFICATION_FINDINGS } from './processor-identification.findings';

const { ACTOR } = BoldDocumentEventName;
const { PROCESSOR } = BoldDocumentEventLabel;

type Subject = {
  processorActorEvents?: BoldDocumentEvent[] | undefined;
};

export class ProcessorIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    processorActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(processorActorEvents)) {
      return {
        ...PROCESSOR_IDENTIFICATION_FINDINGS.result('FAILED.NOT_FOUND'),
        resultStatus: 'FAILED',
      };
    }

    if (processorActorEvents.length > 1) {
      return {
        ...PROCESSOR_IDENTIFICATION_FINDINGS.result('FAILED.MULTIPLE_EVENTS'),
        resultStatus: 'FAILED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(
    document: BoldDocument,
  ): Subject | undefined {
    const processorActorEvents = document.externalEvents?.filter(
      (event) => eventHasLabel(event, PROCESSOR) && eventHasName(event, ACTOR),
    );

    return {
      processorActorEvents,
    };
  }
}
