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
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventLabel,
  BoldDocumentEventName,
  BoldVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './hauler-identification.constants';

const { ACTOR, PICK_UP } = BoldDocumentEventName;
const { HAULER } = BoldDocumentEventLabel;
const { VEHICLE_TYPE } = BoldAttributeName;

type Subject = {
  haulerEvent: BoldDocumentEvent | undefined;
  pickUpEvent: BoldDocumentEvent | undefined;
};

export const OPTIONAL_HAULER_VEHICLE_TYPES = [
  BoldVehicleType.SLUDGE_PIPES,
  BoldVehicleType.CART,
] as const;

export class HaulerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    haulerEvent,
    pickUpEvent,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
        resultStatus: 'FAILED',
      };
    }

    if (!isNil(haulerEvent)) {
      return {
        resultComment: RESULT_COMMENTS.passed.HAULER_EVENT_FOUND,
        resultStatus: 'PASSED',
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
        resultComment: RESULT_COMMENTS.passed.HAULER_NOT_REQUIRED(
          vehicleType as string,
        ),
        resultStatus: 'PASSED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.failed.HAULER_EVENT_MISSING(
        vehicleType as string,
      ),
      resultStatus: 'FAILED',
    };
  }

  protected override getRuleSubject(
    document: BoldDocument,
  ): Subject | undefined {
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
