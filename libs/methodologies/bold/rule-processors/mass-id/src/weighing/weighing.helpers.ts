import {
  getOrDefault,
  isNil,
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
  type ApprovedException,
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
import { isApprovedExceptionAttributeValue } from './weighing.typia';

const { HOMOLOGATION_RESULT, MONITORING_SYSTEMS_AND_EQUIPMENT, WEIGHING } =
  DocumentEventName;
const { TRUCK } = DocumentEventVehicleType;
const {
  APPROVED_EXCEPTIONS,
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

export interface WeighingValues {
  containerCapacityAttribute: MethodologyDocumentEventAttribute | undefined;
  containerCapacityException: ApprovedException | undefined;
  containerQuantity: MethodologyDocumentEventAttributeValue | undefined;
  containerType: string | undefined;
  description: MethodologyDocumentEventAttributeValue | undefined;
  grossWeight: MethodologyDocumentEventAttribute | undefined;
  homologationScaleType: MethodologyDocumentEventAttributeValue | undefined;
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

export const getMandatoryFieldExceptionFromHomologationDocument = (
  recyclerHomologationDocument: Document,
  fieldName: DocumentEventAttributeName,
): ApprovedException | undefined => {
  const homologationResultEvent =
    recyclerHomologationDocument.externalEvents?.find(
      eventNameIsAnyOf([HOMOLOGATION_RESULT]),
    );

  if (!homologationResultEvent) {
    return undefined;
  }

  const approvedExceptions = getEventAttributeValue(
    homologationResultEvent,
    APPROVED_EXCEPTIONS,
  );

  if (!isApprovedExceptionAttributeValue(approvedExceptions)) {
    return undefined;
  }

  return approvedExceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === WEIGHING.toString() &&
      exception['Attribute Name'] === fieldName,
  );
};

export const getHomologationScaleType = (
  recyclerHomologationDocument: Document,
): MethodologyDocumentEventAttributeValue | undefined => {
  const monitoringSystemsAndEquipmentEvent =
    recyclerHomologationDocument.externalEvents?.find(
      eventNameIsAnyOf([MONITORING_SYSTEMS_AND_EQUIPMENT]),
    );

  return getEventAttributeValue(monitoringSystemsAndEquipmentEvent, SCALE_TYPE);
};

export const getValuesRelatedToWeighing = (
  weighingEvent: DocumentEvent,
  recyclerHomologationDocument: Document,
): WeighingValues => ({
  containerCapacityAttribute: getEventAttributeByName(
    weighingEvent,
    CONTAINER_CAPACITY,
  ),
  containerCapacityException:
    getMandatoryFieldExceptionFromHomologationDocument(
      recyclerHomologationDocument,
      CONTAINER_CAPACITY,
    ),
  containerQuantity: getEventAttributeValue(weighingEvent, CONTAINER_QUANTITY),
  containerType: getEventAttributeValue(
    weighingEvent,
    CONTAINER_TYPE,
  )?.toString(),
  description: getEventAttributeValue(weighingEvent, DESCRIPTION),
  grossWeight: getEventAttributeByName(weighingEvent, GROSS_WEIGHT),
  homologationScaleType: getHomologationScaleType(recyclerHomologationDocument),
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

type Validator = (values: WeighingValues, isTwoStep?: boolean) => string[];

const validators: Record<string, Validator> = {
  containerCapacity: (values) => {
    if (!isNil(values.containerCapacityException)) {
      return [];
    }

    const messages: string[] = [];

    if (!hasPositiveValue(values.containerCapacityAttribute)) {
      messages.push(MISSING_RESULT_COMMENTS.CONTAINER_CAPACITY);
    }

    if (!hasKilogramFormat(values.containerCapacityAttribute)) {
      messages.push(INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT);
    }

    return messages;
  },

  containerQuantity: (values) => {
    const messages: string[] = [];

    if (
      values.vehicleType === TRUCK &&
      isNonZeroPositiveInt(values.containerQuantity)
    ) {
      messages.push(INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY);
    }

    if (!isNonZeroPositiveInt(values.containerQuantity)) {
      messages.push(MISSING_RESULT_COMMENTS.CONTAINER_QUANTITY);
    }

    return messages;
  },

  containerType: (values, isTwoStep) => {
    if (!values.containerType) {
      return [MISSING_RESULT_COMMENTS.CONTAINER_TYPE];
    }

    if (
      isTwoStep === true &&
      values.containerType !== DocumentEventContainerType.TRUCK.toString()
    ) {
      return [
        INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(values.containerType),
      ];
    }

    return [];
  },

  description: (values) =>
    isNonEmptyString(values.description)
      ? []
      : [MISSING_RESULT_COMMENTS.DESCRIPTION],

  grossWeight: (values) => {
    const messages: string[] = [];

    if (!hasPositiveValue(values.grossWeight)) {
      messages.push(
        MISSING_RESULT_COMMENTS.GROSS_WEIGHT(values.grossWeight?.value),
      );
    }

    if (!hasKilogramFormat(values.grossWeight)) {
      messages.push(INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT);
    }

    return messages;
  },

  massNetWeight: (values) => {
    const messages: string[] = [];

    if (!hasPositiveValue(values.massNetWeight)) {
      messages.push(
        MISSING_RESULT_COMMENTS.MASS_NET_WEIGHT(values.massNetWeight?.value),
      );
    }

    if (!hasKilogramFormat(values.massNetWeight)) {
      messages.push(INVALID_RESULT_COMMENTS.MASS_NET_WEIGHT_FORMAT);
    }

    return messages;
  },

  netWeightCalculation: (values) => {
    if (
      isNil(values.grossWeight?.value) ||
      isNil(values.tare?.value) ||
      isNil(values.containerQuantity) ||
      isNil(values.massNetWeight?.value)
    ) {
      return [];
    }

    const massNetWeight = Number(values.massNetWeight.value);
    const grossWeight = Number(values.grossWeight.value);
    const tare = Number(values.tare.value);
    const containerQuantity = Number(values.containerQuantity);

    const calculatedNetWeight = grossWeight - tare * containerQuantity;
    const diff = Math.abs(calculatedNetWeight - massNetWeight);

    if (diff > NET_WEIGHT_CALCULATION_TOLERANCE) {
      return [
        INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
          calculatedNetWeight,
          containerQuantity,
          grossWeight,
          massNetWeight,
          tare,
        }),
      ];
    }

    return [];
  },

  scaleType: (values, isTwoStep) => {
    const messages: string[] = [];

    if (!isNonEmptyString(values.homologationScaleType)) {
      return [NOT_FOUND_RESULT_COMMENTS.HOMOLOGATION_EVENT];
    }

    if (String(values.scaleType) !== String(values.homologationScaleType)) {
      messages.push(
        INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
          values.scaleType,
          values.homologationScaleType,
        ),
      );
    }

    if (!is<DocumentEventScaleType>(values.scaleType)) {
      messages.push(INVALID_RESULT_COMMENTS.SCALE_TYPE(values.scaleType));
    }

    if (
      isTwoStep === true &&
      values.scaleType !== DocumentEventScaleType.WEIGHBRIDGE
    ) {
      messages.push(
        INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
          values.scaleType,
        ),
      );
    }

    return messages;
  },

  tare: (values) => {
    const messages: string[] = [];

    if (!hasPositiveValue(values.tare)) {
      messages.push(MISSING_RESULT_COMMENTS.TARE(values.tare?.value));
    }

    if (!hasKilogramFormat(values.tare)) {
      messages.push(INVALID_RESULT_COMMENTS.TARE_FORMAT);
    }

    return messages;
  },

  vehicleLicensePlate: (values) => {
    const messages: string[] = [];
    const attribute = values.vehicleLicensePlateAttribute;

    if (!isValidLicensePlate(attribute?.value)) {
      messages.push(INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT);
    }

    if (attribute?.sensitive !== true) {
      messages.push(INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE);
    }

    return messages;
  },

  weighingCaptureMethod: (values) => {
    if (is<DocumentEventWeighingCaptureMethod>(values.weighingCaptureMethod)) {
      return [];
    }

    return [
      INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(
        values.weighingCaptureMethod,
      ),
    ];
  },
};

export const validateWeighingValues = (
  values: WeighingValues,
  isTwoStepWeighingEvent = false,
): ValidationResult => {
  const results: string[] = [];

  for (const validator of Object.values(validators)) {
    results.push(...validator(values, isTwoStepWeighingEvent));
  }

  return results;
};

export const validateTwoStepWeighingEvents = (
  events: DocumentEvent[],
): ValidationResult => {
  if (events.length !== 2) return [];

  const messages: string[] = [];
  const firstEvent = events[0];
  const secondEvent = events[1];

  if (firstEvent?.participant.id !== secondEvent?.participant.id) {
    messages.push(
      INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
    );
  }

  const attributesToCheck = [
    WEIGHING_CAPTURE_METHOD,
    SCALE_TYPE,
    CONTAINER_CAPACITY,
    CONTAINER_TYPE,
    GROSS_WEIGHT,
    VEHICLE_LICENSE_PLATE,
  ];

  for (const attributeName of attributesToCheck) {
    const firstValue = getEventAttributeValue(firstEvent, attributeName);
    const secondValue = getEventAttributeValue(secondEvent, attributeName);

    if (firstValue !== secondValue) {
      messages.push(
        INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
          attributeName,
          firstValue,
          secondValue,
        }),
      );
    }
  }

  return messages;
};
