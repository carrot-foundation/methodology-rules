import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { LicensePlate } from '@carrot-fndn/shared/types';

import { isNil, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  eventHasNonEmptyStringAttribute,
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
import { is } from 'typia';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  NewDocumentEventAttributeName;
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
  private createResult(
    isApproved: boolean,
    resultComment: string,
  ): EvaluateResultOutput {
    return {
      resultComment,
      resultStatus: isApproved
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

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

    // Convert the vehicleTypeValue to the enum type for comparison
    const vehicleType = vehicleTypeValue as unknown as DocumentEventVehicleType;

    // Check if the vehicle type is in the set of types that don't need a license plate
    const needsLicensePlate =
      !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.has(vehicleType);
    const licensePlate = getEventAttributeValue(event, VEHICLE_LICENSE_PLATE);

    if (!isNil(licensePlate) && !is<LicensePlate>(licensePlate)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.INVALID_LICENSE_PLATE_FORMAT,
      );
    }

    if (
      needsLicensePlate &&
      !eventHasNonEmptyStringAttribute(event, VEHICLE_LICENSE_PLATE)
    ) {
      return this.createResult(
        false,
        RESULT_COMMENTS.LICENSE_PLATE_MISSING(vehicleTypeValue),
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
}
