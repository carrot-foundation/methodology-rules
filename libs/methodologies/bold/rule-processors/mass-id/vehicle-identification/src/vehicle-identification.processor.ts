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
  DocumentEventVehicleTypeSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './vehicle-identification.constants';

export const VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES: Set<DocumentEventVehicleType> =
  new Set([
    DocumentEventVehicleType.Bicycle,
    DocumentEventVehicleType.Cart,
    DocumentEventVehicleType['Sludge Pipes'],
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

    const vehicleTypeValue = getEventAttributeValue(
      event,
      DocumentEventAttributeName['Vehicle Type'],
    );

    if (!isNonEmptyString(vehicleTypeValue)) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.VEHICLE_TYPE_MISSING,
      );
    }

    if (
      !(DocumentEventVehicleTypeSchema.options as unknown[]).includes(
        vehicleTypeValue,
      )
    ) {
      return this.createResult(
        false,
        RESULT_COMMENTS.failed.INVALID_VEHICLE_TYPE(vehicleTypeValue),
      );
    }

    const hasDescription = eventHasNonEmptyStringAttribute(
      event,
      DocumentEventAttributeName['Vehicle Description'],
    );

    if (vehicleTypeValue === (DocumentEventVehicleType.Others as string)) {
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

    const needsLicensePlate = !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.has(
      vehicleTypeValue as DocumentEventVehicleType,
    );

    if (!needsLicensePlate) {
      return this.createResult(
        true,
        RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITHOUT_LICENSE_PLATE(
          vehicleTypeValue,
        ),
      );
    }

    const licensePlate = getEventAttributeValue(
      event,
      DocumentEventAttributeName['Vehicle License Plate'],
    );
    const hasLicensePlate = eventHasNonEmptyStringAttribute(
      event,
      DocumentEventAttributeName['Vehicle License Plate'],
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
      pickUpEvent: document.externalEvents?.find(
        eventNameIsAnyOf([DocumentEventName['Pick-up']]),
      ),
    };
  }

  private createResult(
    passed: boolean,
    resultComment: string,
  ): EvaluateResultOutput {
    return {
      resultComment,
      resultStatus: passed ? 'PASSED' : 'FAILED',
    };
  }
}
