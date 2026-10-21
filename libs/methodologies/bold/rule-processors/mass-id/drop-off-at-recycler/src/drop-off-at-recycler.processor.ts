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
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type BoldAttributeValue } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';
import { DROP_OFF_AT_RECYCLER_FINDINGS } from './drop-off-at-recycler.findings';

const { ACTOR, DROP_OFF } = BoldDocumentEventName;
const { RECYCLER } = BoldDocumentEventLabel;
const { RECEIVING_OPERATOR_IDENTIFIER } = BoldAttributeName;

interface RuleSubject {
  lastDropOffEvent: BoldDocumentEvent | undefined;
  receivingOperatorIdentifier: BoldAttributeValue | string | undefined;
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
        ...DROP_OFF_AT_RECYCLER_FINDINGS.result(
          'FAILED.MISSING_DROP_OFF_EVENT',
        ),
        resultStatus: 'FAILED',
      };
    }

    if (!isNonEmptyString(receivingOperatorIdentifier)) {
      return {
        ...DROP_OFF_AT_RECYCLER_FINDINGS.result(
          'FAILED.MISSING_RECEIVING_OPERATOR_IDENTIFIER',
        ),
        resultStatus: 'FAILED',
      };
    }

    if (lastDropOffEvent.address.id !== recyclerEvent?.address.id) {
      return {
        ...DROP_OFF_AT_RECYCLER_FINDINGS.result('FAILED.ADDRESS_MISMATCH'),
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
