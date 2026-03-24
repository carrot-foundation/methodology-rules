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
import {
  type MethodologyDocumentEventAttributeValue,
  MethodologyDocumentEventLabel,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';

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

  protected override getRuleSubject(document: Document): RuleSubject {
    const recyclerEvent = document.externalEvents?.find(
      and(
        eventLabelIsAnyOf([MethodologyDocumentEventLabel.Recycler]),
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
      ),
    );
    const lastDropOffEvent = document.externalEvents
      ?.filter(eventNameIsAnyOf([DocumentEventName['Drop-off']]))
      .at(-1);

    return {
      lastDropOffEvent,
      receivingOperatorIdentifier: getEventAttributeValue(
        lastDropOffEvent,
        DocumentEventAttributeName['Receiving Operator Identifier'],
      ),
      recyclerEvent,
    };
  }
}
