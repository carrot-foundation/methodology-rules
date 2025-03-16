import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getOrUndefined, isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventHasMetadataAttribute,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR, PICK_UP } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = NewDocumentEventAttributeName;

type Subject = {
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
};

export const OPTIONAL_HAULER_VEHICLE_TYPES = [
  DocumentEventVehicleType.SLUDGE_PIPES,
  DocumentEventVehicleType.CART,
] as const;

export const RESULT_COMMENTS = {
  HAULER_EVENT_FOUND: `A "${HAULER}" event was found.`,
  HAULER_EVENT_MISSING: (vehicleType: string) =>
    `No "${HAULER}" event was found, but it is required for the “${vehicleType}" pick-up "${VEHICLE_TYPE}".`,
  HAULER_NOT_REQUIRED: (vehicleType: string) =>
    `A "${HAULER}" event is not required because the pick-up "${VEHICLE_TYPE}" is ${vehicleType}.`,
  PICK_UP_EVENT_MISSING: `A "${PICK_UP}" event is required and was not found.`,
} as const;

export class HaulerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENTS;
  }

  protected override evaluateResult({
    haulerEvent,
    pickUpEvent,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: this.RESULT_COMMENT.PICK_UP_EVENT_MISSING,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (!isNil(haulerEvent)) {
      return {
        resultComment: this.RESULT_COMMENT.HAULER_EVENT_FOUND,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    const vehicleType = getEventAttributeValue(pickUpEvent, VEHICLE_TYPE);

    const isHaulerOptional = eventHasMetadataAttribute({
      event: pickUpEvent,
      metadataName: VEHICLE_TYPE,
      metadataValues: OPTIONAL_HAULER_VEHICLE_TYPES,
    });

    if (isHaulerOptional) {
      return {
        resultComment: this.RESULT_COMMENT.HAULER_NOT_REQUIRED(
          vehicleType as string,
        ),
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    return {
      resultComment: this.RESULT_COMMENT.HAULER_EVENT_MISSING(
        vehicleType as string,
      ),
      resultStatus: RuleOutputStatus.REJECTED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    return {
      haulerEvent: getOrUndefined(
        document.externalEvents?.find(
          and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([HAULER])),
        ),
      ),
      pickUpEvent: getOrUndefined(
        document.externalEvents?.find(eventNameIsAnyOf([PICK_UP])),
      ),
    };
  }
}
