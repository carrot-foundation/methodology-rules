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

const { ACTOR, DROP_OFF } = DocumentEventName;
const { RECYCLER } = MethodologyDocumentEventLabel;
const { RECEIVING_OPERATOR_IDENTIFIER } = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  ADDRESS_MISMATCH: `The "${DROP_OFF}" event address does not match the "${RECYCLER}" event address.`,
  APPROVED: `The "${DROP_OFF}" event was recorded with a valid "${RECEIVING_OPERATOR_IDENTIFIER}", and its address matches the "${RECYCLER}" event address.`,
  MISSING_DROP_OFF_EVENT: `No "${DROP_OFF}" event was found in the document.`,
  MISSING_RECEIVING_OPERATOR_IDENTIFIER: `The "${DROP_OFF}" event must include a "${RECEIVING_OPERATOR_IDENTIFIER}", but none was provided.`,
} as const;

interface RuleSubject {
  lastDropOffEvent: DocumentEvent | undefined;
  receivingOperatorIdentifier:
    | MethodologyDocumentEventAttributeValue
    | string
    | undefined;
  recyclerEvent: DocumentEvent | undefined;
}

export class DropOffAtRecyclingFacilityProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    lastDropOffEvent,
    receivingOperatorIdentifier,
    recyclerEvent,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(lastDropOffEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_DROP_OFF_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (!isNonEmptyString(receivingOperatorIdentifier)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_RECEIVING_OPERATOR_IDENTIFIER,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (lastDropOffEvent.address.id !== recyclerEvent?.address.id) {
      return {
        resultComment: RESULT_COMMENTS.ADDRESS_MISMATCH,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
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
