import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentEventAttributeName,
  DocumentEventLabel,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type DocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

const { ACTOR, DROP_OFF } = DocumentEventName;
const { RECYCLER } = DocumentEventLabel;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

interface RuleSubject {
  lastDropOffEvent: BoldDocumentEvent | undefined;
  receivingOperatorIdentifier: DocumentEventAttributeValue | string | undefined;
  recyclerEvent: BoldDocumentEvent | undefined;
}

export class DropOffAtRecyclerProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    lastDropOffEvent,
    receivingOperatorIdentifier,
    recyclerEvent,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(lastDropOffEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
        resultStatus: 'FAILED',
      };
    }

    if (!isNonEmptyString(receivingOperatorIdentifier)) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
        resultStatus: 'FAILED',
      };
    }

    if (lastDropOffEvent.address.id !== recyclerEvent?.address.id) {
      return {
        resultComment: RESULT_COMMENTS.failed.ADDRESS_MISMATCH,
        resultStatus: 'FAILED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.VALID_DROP_OFF,
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
    const recyclerEvent = document.externalEvents?.find(
      and(eventLabelIsAnyOf([RECYCLER]), eventNameIsAnyOf([ACTOR])),
    );
    const lastDropOffEvent = document.externalEvents
      ?.filter(eventNameIsAnyOf([DROP_OFF]))
      .at(-1);

    return {
      lastDropOffEvent,
      receivingOperatorIdentifier: getEventAttributeValue(
        lastDropOffEvent,
        RECEIVING_OPERATOR_IDENTIFIER,
      ),
      recyclerEvent,
    };
  }
}
