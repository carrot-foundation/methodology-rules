import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  isNil,
  isNonEmptyString,
  isValidLicensePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  eventHasNonEmptyStringAttribute,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { is } from 'typia';

import { RESULT_COMMENTS } from './vehicle-identification.constants';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  DocumentEventAttributeName;
const { BICYCLE, CART, OTHERS, SLUDGE_PIPES } = DocumentEventVehicleType;
const { PICK_UP } = DocumentEventName;

export const VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES = new Set([
  BICYCLE,
  CART,
  SLUDGE_PIPES,
]);

interface RuleSubject {
  pickUpEvent?: DocumentEvent | undefined;
}

export class VehicleIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    pickUpEvent: event,
  }: RuleSubject): EvaluateResultOutput {
    if (isNil(event)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
      );
    }

    const vehicleTypeValue = getEventAttributeValue(event, VEHICLE_TYPE);

    if (!isNonEmptyString(vehicleTypeValue)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.VEHICLE_TYPE_MISSING,
      );
    }

    if (!is<DocumentEventVehicleType>(vehicleTypeValue)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.INVALID_VEHICLE_TYPE(vehicleTypeValue),
      );
    }

    const hasDescription = eventHasNonEmptyStringAttribute(
      event,
      VEHICLE_DESCRIPTION,
    );

    if (vehicleTypeValue === OTHERS) {
      return hasDescription
        ? this.createResult(
            true,
            RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_DESCRIPTION(
              vehicleTypeValue,
            ),
          )
        : this.createResult(
            false,
            RESULT_COMMENTS.failed.VEHICLE_DESCRIPTION_MISSING(
              vehicleTypeValue,
            ),
          );
    }

    const needsLicensePlate =
      !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.has(vehicleTypeValue);

    if (!needsLicensePlate) {
      return this.createResult(
        true,
        RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE(
          vehicleTypeValue,
        ),
      );
    }

    const licensePlate = getEventAttributeValue(event, VEHICLE_LICENSE_PLATE);
    const hasLicensePlate = eventHasNonEmptyStringAttribute(
      event,
      VEHICLE_LICENSE_PLATE,
    );

    if (!hasLicensePlate) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.LICENSE_PLATE_MISSING(vehicleTypeValue),
      );
    }

    if (!isValidLicensePlate(licensePlate)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.INVALID_LICENSE_PLATE_FORMAT,
      );
    }

    return this.createResult(
      true,
      RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    );
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    return {
      pickUpEvent: document.externalEvents?.find(eventNameIsAnyOf([PICK_UP])),
    };
  }

  private createResult(
    passed: boolean,
    resultComment: string,
  ): EvaluateResultOutput {
    return {
      resultComment,
      resultStatus: passed ? RuleOutputStatus.PASSED : RuleOutputStatus.FAILED,
    };
  }
}
