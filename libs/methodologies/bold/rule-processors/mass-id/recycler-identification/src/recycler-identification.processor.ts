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
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './recycler-identification.constants';

const { ACTOR } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;

type Subject = {
  recyclerActorEvents?: DocumentEvent[] | undefined;
};

export class RecyclerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    recyclerActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(recyclerActorEvents)) {
      return {
        resultComment: RESULT_COMMENTS.failed.NOT_FOUND,
        resultStatus: 'FAILED' as const,
      };
    }

    if (recyclerActorEvents.length > 1) {
      return {
        resultComment: RESULT_COMMENTS.failed.MULTIPLE_EVENTS,
        resultStatus: 'FAILED' as const,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.SINGLE_EVENT,
      resultStatus: 'PASSED' as const,
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
