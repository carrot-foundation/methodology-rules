import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { PICK_UP, WASTE_GENERATOR } = DocumentEventName;

type Subject = {
  pickUpEvent?: DocumentEvent | undefined;
  wasteGeneratorEvents?: DocumentEvent[] | undefined;
};

export const RESULT_COMMENT = {
  IDENTIFIED: `The ${WASTE_GENERATOR} event was identified.`,
  MISSING_PICK_UP_EVENT: `The ${PICK_UP} event was not found.`,
  MULTIPLE_WASTE_GENERATORS: `The ${WASTE_GENERATOR} event was defined more than once.`,
  UNIDENTIFIED: `The ${PICK_UP} event has the metadata ${DocumentEventAttributeName.WASTE_ORIGIN} with the value ${DocumentEventAttributeValue.UNIDENTIFIED}.`,
  UNIDENTIFIED_WITH_WASTE_GENERATOR: `The ${PICK_UP} event has the metadata ${DocumentEventAttributeName.WASTE_ORIGIN} with the value ${DocumentEventAttributeValue.UNIDENTIFIED} and the ${WASTE_GENERATOR} event was defined.`,
  UNIDENTIFIED_WITHOUT_WASTE_GENERATOR: `The ${PICK_UP} event has no ${DocumentEventAttributeName.WASTE_ORIGIN} metadata and the ${WASTE_GENERATOR} event was not defined.`,
} as const;

export class WasteOriginIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENT;
  }

  protected override evaluateResult({
    pickUpEvent,
    wasteGeneratorEvents,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_PICK_UP_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (
      isNonEmptyArray(wasteGeneratorEvents) &&
      wasteGeneratorEvents.length > 1
    ) {
      return {
        resultComment: this.RESULT_COMMENT.MULTIPLE_WASTE_GENERATORS,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const wasteOrigin = getEventAttributeValue(
      pickUpEvent,
      DocumentEventAttributeName.WASTE_ORIGIN,
    );
    const hasWasteGenerator = !isNil(wasteGeneratorEvents?.[0]);
    const isUnidentified =
      wasteOrigin === DocumentEventAttributeValue.UNIDENTIFIED;

    if (!isUnidentified && hasWasteGenerator) {
      return {
        resultComment: this.RESULT_COMMENT.IDENTIFIED,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    if (isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: this.RESULT_COMMENT.UNIDENTIFIED,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    if (!isUnidentified && !hasWasteGenerator) {
      return {
        resultComment: this.RESULT_COMMENT.UNIDENTIFIED_WITHOUT_WASTE_GENERATOR,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.UNIDENTIFIED_WITH_WASTE_GENERATOR,
      resultStatus: RuleOutputStatus.REJECTED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );

    const wasteGeneratorEvents = document.externalEvents?.filter(
      eventNameIsAnyOf([WASTE_GENERATOR]),
    );

    return {
      pickUpEvent,
      wasteGeneratorEvents,
    };
  }
}
