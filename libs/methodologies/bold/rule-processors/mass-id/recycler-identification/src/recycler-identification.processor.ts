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

import { RESULT_COMMENTS } from './recycler-identification.constants';
import { RECYCLER_IDENTIFICATION_FINDINGS } from './recycler-identification.findings';

const { ACTOR } = BoldDocumentEventName;
const { RECYCLER } = BoldDocumentEventLabel;

type Subject = {
  recyclerActorEvents?: BoldDocumentEvent[] | undefined;
};

export class RecyclerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    recyclerActorEvents,
  }: Subject): EvaluateResultOutput {
    if (!isNonEmptyArray(recyclerActorEvents)) {
      return {
        ...RECYCLER_IDENTIFICATION_FINDINGS.result('FAILED.NOT_FOUND'),
        resultStatus: 'FAILED',
      };
    }

    if (recyclerActorEvents.length > 1) {
      return {
        ...RECYCLER_IDENTIFICATION_FINDINGS.result('FAILED.MULTIPLE_EVENTS'),
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
    const recyclerActorEvents = document.externalEvents?.filter(
      (event) => eventHasLabel(event, RECYCLER) && eventHasName(event, ACTOR),
    );

    return {
      recyclerActorEvents,
    };
  }
}
