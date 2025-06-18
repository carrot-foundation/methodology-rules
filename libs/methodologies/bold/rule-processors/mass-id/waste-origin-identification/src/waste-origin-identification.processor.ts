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
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { ACTOR, PICK_UP, WASTE_GENERATOR } = DocumentEventName;
const { UNIDENTIFIED } = DocumentEventAttributeValue;

type Subject = {
  pickUpEvent?: DocumentEvent | undefined;
  wasteGeneratorEvents?: DocumentEvent[] | undefined;
};

export const RESULT_COMMENT = {
  MISSING_PICK_UP_EVENT: `The ${PICK_UP} event was not found.`,
  MISSING_WASTE_GENERATOR_EVENT: `No "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, and the waste origin is not "${UNIDENTIFIED}".`,
  MULTIPLE_WASTE_GENERATOR_EVENTS: `More than one "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, but only one is allowed.`,
  UNIDENTIFIED_WASTE_ORIGIN: `No "${ACTOR}" event with the label "${WASTE_GENERATOR}" event was found, and the waste origin is "${UNIDENTIFIED}".`,
  WASTE_ORIGIN_CONFLICT: `An "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found, but the waste origin is "${UNIDENTIFIED}".`,
  WASTE_ORIGIN_IDENTIFIED: `A single "${ACTOR}" event with the label "${WASTE_GENERATOR}" was found.`,
} as const;

export class WasteOriginIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    pickUpEvent,
    wasteGeneratorEvents,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENT.MISSING_PICK_UP_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (
      isNonEmptyArray(wasteGeneratorEvents) &&
      wasteGeneratorEvents.length > 1
    ) {
      return {
        resultComment: RESULT_COMMENT.MULTIPLE_WASTE_GENERATOR_EVENTS,
        resultStatus: RuleOutputStatus.FAILED,
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
        resultComment: RESULT_COMMENT.WASTE_ORIGIN_IDENTIFIED,
        resultStatus: RuleOutputStatus.PASSED,
      };
    }

    if (isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: RESULT_COMMENT.UNIDENTIFIED_WASTE_ORIGIN,
        resultStatus: RuleOutputStatus.PASSED,
      };
    }

    if (!isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: RESULT_COMMENT.MISSING_WASTE_GENERATOR_EVENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: RESULT_COMMENT.WASTE_ORIGIN_CONFLICT,
      resultStatus: RuleOutputStatus.FAILED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
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
