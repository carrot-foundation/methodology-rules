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

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  DocumentEventAttributeName;
const { BICYCLE, CART, OTHERS, SLUDGE_PIPES } = DocumentEventVehicleType;
const { PICK_UP } = DocumentEventName;

export const VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES = new Set([
  BICYCLE,
  CART,
  SLUDGE_PIPES,
]);

export const RESULT_COMMENTS = {
  INVALID_LICENSE_PLATE_FORMAT: `The "${VEHICLE_LICENSE_PLATE}" format is invalid.`,
  INVALID_VEHICLE_TYPE: (vehicleType: string) =>
    `The "${VEHICLE_TYPE}" "${vehicleType}" is not supported by the methodology.`,
  LICENSE_PLATE_MISSING: (vehicleType: string) =>
    `The "${VEHICLE_TYPE}" is "${vehicleType}", which requires a "${VEHICLE_LICENSE_PLATE}", but none was provided.`,
  PICK_UP_EVENT_MISSING: `Expected "${PICK_UP}" event to be declared.`,
  VEHICLE_DESCRIPTION_MISSING: (vehicleType: string) =>
    `The "${VEHICLE_TYPE}" is "${vehicleType}", which requires a "${VEHICLE_DESCRIPTION}", but none was provided.`,
  VEHICLE_IDENTIFIED_WITH_DESCRIPTION: (vehicleType: string) =>
    `A "${VEHICLE_LICENSE_PLATE}" is not required for "${vehicleType}", and the "${VEHICLE_DESCRIPTION}" was provided.`,
  VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE: `A valid "${VEHICLE_TYPE}" and correctly formatted "${VEHICLE_LICENSE_PLATE}" were provided.`,
  VEHICLE_TYPE_MISSING: `The "${VEHICLE_TYPE}" was not provided.`,
} as const;

interface RuleSubject {
  pickUpEvent?: DocumentEvent | undefined;
}

export class VehicleIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    pickUpEvent: event,
  }: RuleSubject): EvaluateResultOutput {
    if (isNil(event)) {
      return this.createResult(false, RESULT_COMMENTS.PICK_UP_EVENT_MISSING);
    }

    const vehicleTypeValue = getEventAttributeValue(event, VEHICLE_TYPE);

    if (!isNonEmptyString(vehicleTypeValue)) {
      return this.createResult(false, RESULT_COMMENTS.VEHICLE_TYPE_MISSING);
    }

    if (!is<DocumentEventVehicleType>(vehicleTypeValue)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.INVALID_VEHICLE_TYPE(vehicleTypeValue),
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
            RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_DESCRIPTION(
              vehicleTypeValue,
            ),
          )
        : this.createResult(
            false,
            RESULT_COMMENTS.VEHICLE_DESCRIPTION_MISSING(vehicleTypeValue),
          );
    }

    const needsLicensePlate =
      !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.has(vehicleTypeValue);

    if (!needsLicensePlate) {
      return this.createResult(
        true,
        RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
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
        RESULT_COMMENTS.LICENSE_PLATE_MISSING(vehicleTypeValue),
      );
    }

    if (!isValidLicensePlate(licensePlate)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.INVALID_LICENSE_PLATE_FORMAT,
      );
    }

    return this.createResult(
      true,
      RESULT_COMMENTS.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
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
