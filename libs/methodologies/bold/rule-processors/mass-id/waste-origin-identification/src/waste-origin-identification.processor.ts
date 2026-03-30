import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
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
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './waste-origin-identification.constants';

const { ACTOR, PICK_UP, WASTE_GENERATOR } = DocumentEventName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;

type Subject = {
  pickUpEvent?: BoldDocumentEvent | undefined;
  wasteGeneratorEvents?: BoldDocumentEvent[] | undefined;
};

export class WasteOriginIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    pickUpEvent,
    wasteGeneratorEvents,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
        resultStatus: 'FAILED',
      };
    }

    if (
      isNonEmptyArray(wasteGeneratorEvents) &&
      wasteGeneratorEvents.length > 1
    ) {
      return {
        resultComment: RESULT_COMMENTS.failed.MULTIPLE_WASTE_GENERATOR_EVENTS,
        resultStatus: 'FAILED',
      };
    }

    const wasteOrigin = getEventAttributeValue(
      pickUpEvent,
      DocumentEventAttributeName.WASTE_ORIGIN,
    );
    const hasWasteGenerator = !isNil(wasteGeneratorEvents?.[0]);
    const isUnidentified = wasteOrigin === UNIDENTIFIED;

    if (!isUnidentified && hasWasteGenerator) {
      return {
        resultComment: RESULT_COMMENTS.passed.WASTE_ORIGIN_IDENTIFIED,
        resultStatus: 'PASSED',
      };
    }

    if (isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: RESULT_COMMENTS.passed.UNIDENTIFIED_WASTE_ORIGIN,
        resultStatus: 'PASSED',
      };
    }

    if (!isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_WASTE_GENERATOR_EVENT,
        resultStatus: 'FAILED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.failed.WASTE_ORIGIN_CONFLICT,
      resultStatus: 'FAILED',
    };
  }

  protected override getRuleSubject(document: BoldDocument): Subject | undefined {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );

    const wasteGeneratorEvents = document.externalEvents?.filter(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([WASTE_GENERATOR])),
    );

    return {
      pickUpEvent,
      wasteGeneratorEvents,
    };
  }
}
