import {
  getOrDefault,
  isNonEmptyString,
  isNonZeroPositive,
  isNonZeroPositiveInt,
  isValidLicensePlate,
} from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeByName,
  getEventAttributeValue,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventContainerType,
  DocumentEventName,
  DocumentEventScaleType,
  DocumentEventVehicleType,
  DocumentEventWeighingCaptureMethod,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeFormat,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';
import { is } from 'typia';

import {
  INVALID_RESULT_COMMENTS,
  MISSING_RESULT_COMMENTS,
  NET_WEIGHT_CALCULATION_TOLERANCE,
  NOT_FOUND_RESULT_COMMENTS,
} from './weighing.constants';

const { MONITORING_SYSTEMS_AND_EQUIPMENT, WEIGHING } = DocumentEventName;
const { TRUCK } = DocumentEventVehicleType;
const {
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  GROSS_WEIGHT,
  MASS_NET_WEIGHT,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  VEHICLE_TYPE,
  WEIGHING_CAPTURE_METHOD,
} = DocumentEventAttributeName;

export interface WeighingEventValues {
  containerCapacityAttribute: MethodologyDocumentEventAttribute | undefined;
  containerQuantity: MethodologyDocumentEventAttributeValue | undefined;
  containerType: string | undefined;
  description: MethodologyDocumentEventAttributeValue | undefined;
  grossWeight: MethodologyDocumentEventAttribute | undefined;
  massNetWeight: MethodologyDocumentEventAttribute | undefined;
  scaleType: MethodologyDocumentEventAttributeValue | undefined;
  tare: MethodologyDocumentEventAttribute | undefined;
  vehicleLicensePlateAttribute: MethodologyDocumentEventAttribute | undefined;
  vehicleType: MethodologyDocumentEventAttributeValue | undefined;
  weighingCaptureMethod: string | undefined;
}

export type ValidationResult = string[];

const hasKilogramFormat = (
  attribute?: MethodologyDocumentEventAttribute,
): boolean =>
  attribute?.format === MethodologyDocumentEventAttributeFormat.KILOGRAM;

const hasPositiveValue = (
  attribute?: MethodologyDocumentEventAttribute,
): boolean => isNonZeroPositive(attribute?.value);

export const getWeighingEventValues = (
  weighingEvent: DocumentEvent,
): WeighingEventValues => ({
  containerCapacityAttribute: getEventAttributeByName(
    weighingEvent,
    CONTAINER_CAPACITY,
  ),
  containerQuantity: getEventAttributeValue(weighingEvent, CONTAINER_QUANTITY),
  containerType: getEventAttributeValue(
    weighingEvent,
    CONTAINER_TYPE,
  )?.toString(),
  description: getEventAttributeValue(weighingEvent, DESCRIPTION),
  grossWeight: getEventAttributeByName(weighingEvent, GROSS_WEIGHT),
  massNetWeight: getEventAttributeByName(weighingEvent, MASS_NET_WEIGHT),
  scaleType: getEventAttributeValue(weighingEvent, SCALE_TYPE),
  tare: getEventAttributeByName(weighingEvent, TARE),
  vehicleLicensePlateAttribute: getEventAttributeByName(
    weighingEvent,
    VEHICLE_LICENSE_PLATE,
  ),
  vehicleType: getEventAttributeValue(weighingEvent, VEHICLE_TYPE),
  weighingCaptureMethod: getEventAttributeValue(
    weighingEvent,
    WEIGHING_CAPTURE_METHOD,
  )?.toString(),
});

export const getWeighingEvents = (document: Document): DocumentEvent[] =>
  getOrDefault(
    document.externalEvents?.filter(
      (event) => String(event.name) === String(WEIGHING),
    ),
    [],
  );

export const validateContainerCapacityAttribute = (
  containerCapacityAttribute: MethodologyDocumentEventAttribute | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (!hasPositiveValue(containerCapacityAttribute)) {
    rejectedMessages.push(MISSING_RESULT_COMMENTS.CONTAINER_CAPACITY);
  }

  if (!hasKilogramFormat(containerCapacityAttribute)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT);
  }

  return rejectedMessages;
};

export const validateContainerQuantity = (
  containerQuantity: MethodologyDocumentEventAttributeValue | undefined,
  vehicleType: MethodologyDocumentEventAttributeValue | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (vehicleType === TRUCK && isNonZeroPositiveInt(containerQuantity)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY);
  }

  if (!isNonZeroPositiveInt(containerQuantity)) {
    rejectedMessages.push(MISSING_RESULT_COMMENTS.CONTAINER_QUANTITY);
  }

  return rejectedMessages;
};

export const validateGrossWeightAttribute = (
  grossWeight: MethodologyDocumentEventAttribute | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (!hasPositiveValue(grossWeight)) {
    rejectedMessages.push(
      MISSING_RESULT_COMMENTS.GROSS_WEIGHT(grossWeight?.value),
    );
  }

  if (!hasKilogramFormat(grossWeight)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT);
  }

  return rejectedMessages;
};

export const validateMassNetWeightAttribute = (
  massNetWeightAttribute: MethodologyDocumentEventAttribute | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (!hasPositiveValue(massNetWeightAttribute)) {
    rejectedMessages.push(
      MISSING_RESULT_COMMENTS.MASS_NET_WEIGHT(massNetWeightAttribute?.value),
    );
  }

  if (!hasKilogramFormat(massNetWeightAttribute)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.MASS_NET_WEIGHT_FORMAT);
  }

  return rejectedMessages;
};

export const validateTareAttribute = (
  tare: MethodologyDocumentEventAttribute | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (!hasPositiveValue(tare)) {
    rejectedMessages.push(MISSING_RESULT_COMMENTS.TARE(tare?.value));
  }

  if (!hasKilogramFormat(tare)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.TARE_FORMAT);
  }

  return rejectedMessages;
};

export const validateVehicleLicensePlateAttribute = (
  vehicleLicensePlateAttribute: MethodologyDocumentEventAttribute | undefined,
): ValidationResult => {
  const rejectedMessages: string[] = [];

  if (!isValidLicensePlate(vehicleLicensePlateAttribute?.value)) {
    rejectedMessages.push(INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT);
  }

  if (vehicleLicensePlateAttribute?.sensitive !== true) {
    rejectedMessages.push(
      INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE,
    );
  }

  return rejectedMessages;
};

export const validateScaleHomologationStatus = (
  scaleType: MethodologyDocumentEventAttributeValue | undefined,
  recyclerHomologationDocument: Document,
): ValidationResult => {
  const monitoringSystemsAndEquipmentEvent =
    recyclerHomologationDocument.externalEvents?.find(
      eventNameIsAnyOf([MONITORING_SYSTEMS_AND_EQUIPMENT]),
    );
  const homologationScaleType = getEventAttributeValue(
    monitoringSystemsAndEquipmentEvent,
    SCALE_TYPE,
  );

  if (!isNonEmptyString(homologationScaleType)) {
    return [NOT_FOUND_RESULT_COMMENTS.HOMOLOGATION_EVENT];
  }

  if (scaleType !== homologationScaleType) {
    return [
      INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
        scaleType,
        homologationScaleType,
      ),
    ];
  }

  return [];
};

export const validateDescription = (
  description: MethodologyDocumentEventAttributeValue | undefined,
): ValidationResult =>
  isNonEmptyString(description) ? [] : [MISSING_RESULT_COMMENTS.DESCRIPTION];

export const validateNetWeightCalculationDifference = ({
  containerQuantity,
  grossWeight,
  massNetWeight,
  tare,
}: {
  containerQuantity: number;
  grossWeight: number;
  massNetWeight: number;
  tare: number;
}): ValidationResult => {
  const calculatedNetWeight = grossWeight - tare * containerQuantity;

  return Math.abs(calculatedNetWeight - massNetWeight) >
    NET_WEIGHT_CALCULATION_TOLERANCE
    ? [
        INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
          calculatedNetWeight,
          containerQuantity,
          grossWeight,
          massNetWeight,
          tare,
        }),
      ]
    : [];
};

export const validateContainerType = (
  containerType: string | undefined,
  isTwoStepWeighingEvent?: boolean,
): ValidationResult => {
  if (
    isTwoStepWeighingEvent === true &&
    containerType !== DocumentEventContainerType.TRUCK
  ) {
    return [INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(containerType)];
  }

  return is<DocumentEventContainerType>(containerType)
    ? []
    : [MISSING_RESULT_COMMENTS.CONTAINER_TYPE];
};

export const validateWeighingCaptureMethod = (
  weighingCaptureMethod: string | undefined,
): ValidationResult =>
  is<DocumentEventWeighingCaptureMethod>(weighingCaptureMethod)
    ? []
    : [INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(weighingCaptureMethod)];

export const validateScaleType = (
  scaleType: MethodologyDocumentEventAttributeValue | undefined,
  isTwoStepWeighingEvent?: boolean,
): ValidationResult => {
  if (
    isTwoStepWeighingEvent === true &&
    scaleType !== DocumentEventScaleType.WEIGHBRIDGE
  ) {
    return [
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(scaleType),
    ];
  }

  return is<DocumentEventScaleType>(scaleType)
    ? []
    : [INVALID_RESULT_COMMENTS.SCALE_TYPE(scaleType)];
};
