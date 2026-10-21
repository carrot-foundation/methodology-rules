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
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
  BoldVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './vehicle-identification.constants';
import { VEHICLE_IDENTIFICATION_FINDINGS } from './vehicle-identification.findings';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  BoldAttributeName;
const { BICYCLE, CART, OTHERS, SLUDGE_PIPES } = BoldVehicleType;
const { PICK_UP } = BoldDocumentEventName;

export const VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES = new Set<string>([
  BICYCLE,
  CART,
  SLUDGE_PIPES,
]);

interface RuleSubject {
  pickUpEvent?: BoldDocumentEvent | undefined;
}

export class VehicleIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    pickUpEvent: event,
  }: RuleSubject): EvaluateResultOutput {
    if (isNil(event)) {
      return {
        ...VEHICLE_IDENTIFICATION_FINDINGS.result(
          'FAILED.PICK_UP_EVENT_MISSING',
        ),
        resultStatus: 'FAILED',
      };
    }

    const vehicleTypeValue = getEventAttributeValue(event, VEHICLE_TYPE);

    if (!isNonEmptyString(vehicleTypeValue)) {
      return {
        ...VEHICLE_IDENTIFICATION_FINDINGS.result(
          'FAILED.VEHICLE_TYPE_MISSING',
        ),
        resultStatus: 'FAILED',
      };
    }

    if (
      !(Object.values(BoldVehicleType) as unknown[]).includes(vehicleTypeValue)
    ) {
      return {
        ...VEHICLE_IDENTIFICATION_FINDINGS.result(
          'FAILED.INVALID_VEHICLE_TYPE',
          vehicleTypeValue,
        ),
        resultStatus: 'FAILED',
      };
    }

    const hasDescription = eventHasNonEmptyStringAttribute(
      event,
      VEHICLE_DESCRIPTION,
    );

    if (vehicleTypeValue === (OTHERS as string)) {
      return hasDescription
        ? this.createPassedResult(
            RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_DESCRIPTION(
              vehicleTypeValue,
            ),
          )
        : {
            ...VEHICLE_IDENTIFICATION_FINDINGS.result(
              'FAILED.VEHICLE_DESCRIPTION_MISSING',
              vehicleTypeValue,
            ),
            resultStatus: 'FAILED',
          };
    }

    const needsLicensePlate =
      !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.has(vehicleTypeValue);

    if (!needsLicensePlate) {
      return this.createPassedResult(
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
      return {
        ...VEHICLE_IDENTIFICATION_FINDINGS.result(
          'FAILED.LICENSE_PLATE_MISSING',
          vehicleTypeValue,
        ),
        resultStatus: 'FAILED',
      };
    }

    if (!isValidLicensePlate(licensePlate)) {
      return {
        ...VEHICLE_IDENTIFICATION_FINDINGS.result(
          'FAILED.INVALID_LICENSE_PLATE_FORMAT',
        ),
        resultStatus: 'FAILED',
      };
    }

    return this.createPassedResult(
      RESULT_COMMENTS.passed.VEHICLE_IDENTIFIED_WITH_LICENSE_PLATE,
    );
  }

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
    return {
      pickUpEvent: document.externalEvents?.find(eventNameIsAnyOf([PICK_UP])),
    };
  }

  private createPassedResult(resultComment: string): EvaluateResultOutput {
    return { resultComment, resultStatus: 'PASSED' };
  }
}
