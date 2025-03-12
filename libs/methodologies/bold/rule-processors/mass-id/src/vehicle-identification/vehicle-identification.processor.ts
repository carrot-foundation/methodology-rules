import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
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
import { validate } from 'typia';

const { VEHICLE_DESCRIPTION, VEHICLE_LICENSE_PLATE, VEHICLE_TYPE } =
  NewDocumentEventAttributeName;
const { BICYCLE, CART, OTHERS, SLUDGE_PIPES } = DocumentEventVehicleType;
const { PICK_UP } = DocumentEventName;

export const VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES = [
  BICYCLE,
  CART,
  SLUDGE_PIPES,
];

export const RESULT_COMMENTS = {
  APPROVED: (vehicleType: string): string =>
    `The "${VEHICLE_TYPE}" with value "${vehicleType}" was correctly identified.`,
  MISSING_VEHICLE_DESCRIPTION: `Expected "${VEHICLE_DESCRIPTION}" attribute to be declared if "${VEHICLE_TYPE}" attribute is "${OTHERS}".`,
  MISSING_VEHICLE_LICENSE_PLATE: (vehicleType: string): string =>
    `Expected "${VEHICLE_LICENSE_PLATE}" attribute to be declared if "${VEHICLE_TYPE}" is not one of the following: ${VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.join(', ')}. But got "${vehicleType}".`,
  MISSING_VEHICLE_TYPE_DECLARATION: `Expected "${VEHICLE_TYPE}" attribute to be declared.`,
  PICK_UP_EVENT_MISSING: `Expected "${PICK_UP}" event to be declared.`,
  VEHICLE_TYPE_MISMATCH: (vehicleType: string): string =>
    `Expected "${VEHICLE_TYPE}" attribute to be one of the following: ${Object.values(DocumentEventVehicleType).join(', ')} but got "${vehicleType}".`,
} as const;

interface RuleSubject {
  pickUpEvent?: DocumentEvent | undefined;
}

export class VehicleIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENTS;
  }

  private approve(vehicleType: string): EvaluateResultOutput {
    return {
      resultComment: this.RESULT_COMMENT.APPROVED(vehicleType),
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  private reject(resultComment: string): EvaluateResultOutput {
    return {
      resultComment,
      resultStatus: RuleOutputStatus.REJECTED,
    };
  }

  protected override evaluateResult({
    pickUpEvent: event,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(event)) {
      return this.reject(this.RESULT_COMMENT.PICK_UP_EVENT_MISSING);
    }

    const vehicleTypeValue = getEventAttributeValue(event, VEHICLE_TYPE);

    if (isNil(vehicleTypeValue)) {
      return this.reject(this.RESULT_COMMENT.MISSING_VEHICLE_TYPE_DECLARATION);
    }

    const vehicleTypeValidation =
      validate<DocumentEventVehicleType>(vehicleTypeValue);

    if (!vehicleTypeValidation.success) {
      return this.reject(
        this.RESULT_COMMENT.VEHICLE_TYPE_MISMATCH(
          String(vehicleTypeValidation.data),
        ),
      );
    }

    const vehicleType = vehicleTypeValue as DocumentEventVehicleType;

    if (
      vehicleType === OTHERS &&
      !eventHasNonEmptyStringAttribute(event, VEHICLE_DESCRIPTION)
    ) {
      return this.reject(this.RESULT_COMMENT.MISSING_VEHICLE_DESCRIPTION);
    }

    const needsLicensePlate =
      !VEHICLE_TYPE_NON_LICENSE_PLATE_VALUES.includes(vehicleType) &&
      vehicleType !== OTHERS;

    if (
      needsLicensePlate &&
      !eventHasNonEmptyStringAttribute(event, VEHICLE_LICENSE_PLATE)
    ) {
      return this.reject(
        this.RESULT_COMMENT.MISSING_VEHICLE_LICENSE_PLATE(
          vehicleType.toString(),
        ),
      );
    }

    return this.approve(vehicleType.toString());
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    return {
      pickUpEvent: document.externalEvents?.find(eventNameIsAnyOf([PICK_UP])),
    };
  }
}
