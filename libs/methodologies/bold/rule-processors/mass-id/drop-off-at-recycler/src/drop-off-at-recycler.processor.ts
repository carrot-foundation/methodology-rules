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
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import {
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

const { ACTOR, DROP_OFF } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

interface RuleSubject {
  lastDropOffEvent: DocumentEvent | undefined;
  receivingOperatorIdentifier:
    | MethodologyDocumentEventAttributeValue
    | string
    | undefined;
  recyclerEvent: DocumentEvent | undefined;
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
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (!isNonEmptyString(receivingOperatorIdentifier)) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (lastDropOffEvent.address.id !== recyclerEvent?.address.id) {
      return {
        resultComment: RESULT_COMMENTS.failed.ADDRESS_MISMATCH,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.PASSED,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  protected override getRuleSubject(document: Document): RuleSubject {
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
