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
  DocumentEventWeighingCaptureMethod,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type ApprovedException,
  type MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeFormat,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';
import { isAfter, isValid, parseISO } from 'date-fns';
import { is } from 'typia';

import {
  INVALID_RESULT_COMMENTS,
  NET_WEIGHT_CALCULATION_TOLERANCE,
  NOT_FOUND_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import {
  type ContainerCapacityApprovedException,
  type TareApprovedException,
} from './weighing.types';
import {
  isApprovedExceptionAttributeValue,
  isContainerCapacityApprovedException,
  isTareApprovedException,
} from './weighing.typia';

const { ACCREDITATION_RESULT, MONITORING_SYSTEMS_AND_EQUIPMENT, WEIGHING } =
  DocumentEventName;
const {
  APPROVED_EXCEPTIONS,
  CONTAINER_CAPACITY,
  CONTAINER_QUANTITY,
  CONTAINER_TYPE,
  DESCRIPTION,
  GROSS_WEIGHT,
  SCALE_TYPE,
  TARE,
  VEHICLE_LICENSE_PLATE,
  WEIGHING_CAPTURE_METHOD,
} = DocumentEventAttributeName;

export type ValidationResult = { errors: string[] };

export interface WeighingValues {
  accreditationScaleType: MethodologyDocumentEventAttributeValue | undefined;
  containerCapacityAttribute: MethodologyDocumentEventAttribute | undefined;
  containerCapacityException: ContainerCapacityApprovedException | undefined;
  containerQuantity: MethodologyDocumentEventAttributeValue | undefined;
  containerType: string | undefined;
  description: MethodologyDocumentEventAttributeValue | undefined;
  eventValue: number | undefined;
  grossWeight: MethodologyDocumentEventAttribute | undefined;
  scaleType: MethodologyDocumentEventAttributeValue | undefined;
  tare: MethodologyDocumentEventAttribute | undefined;
  tareException: TareApprovedException | undefined;
  vehicleLicensePlateAttribute: MethodologyDocumentEventAttribute | undefined;
  weighingCaptureMethod: string | undefined;
}

const hasValidAttributeFormat = (
  attribute?: MethodologyDocumentEventAttribute,
): boolean => is<MethodologyDocumentEventAttributeFormat>(attribute?.format);

const hasPositiveFloatAttributeValue = (
  attribute?: MethodologyDocumentEventAttribute,
): boolean => isNonZeroPositive(attribute?.value);

const isTruckContainer = (values: WeighingValues): boolean =>
  values.containerType === DocumentEventContainerType.TRUCK.toString();

const isAttributeOmitted = (
  attribute?: MethodologyDocumentEventAttribute,
): boolean => isNil(attribute?.value) || attribute.value === '';

const shouldSkipValidationWithTareException = (
  values: WeighingValues,
  isOmitted: boolean,
): boolean =>
  isTruckContainer(values) &&
  isExceptionValid(values.tareException) &&
  isOmitted;

const shouldSkipNetWeightCalculationWithTareException = (
  values: WeighingValues,
): boolean =>
  isTruckContainer(values) &&
  isExceptionValid(values.tareException) &&
  (isAttributeOmitted(values.grossWeight) || isAttributeOmitted(values.tare));

const getApprovedExceptions = (
  recyclerAccreditationDocument: Document,
): ApprovedException[] | undefined => {
  const accreditationResultEvent =
    recyclerAccreditationDocument.externalEvents?.find(
      eventNameIsAnyOf([ACCREDITATION_RESULT]),
    );

  if (!accreditationResultEvent) {
    return undefined;
  }

  const approvedExceptions = getEventAttributeValue(
    accreditationResultEvent,
    APPROVED_EXCEPTIONS,
  );

  if (!isApprovedExceptionAttributeValue(approvedExceptions)) {
    return undefined;
  }

  return approvedExceptions;
};

export const getTareExceptionFromAccreditationDocument = (
  recyclerAccreditationDocument: Document,
): TareApprovedException | undefined => {
  const exceptions = getApprovedExceptions(recyclerAccreditationDocument);

  if (!exceptions) {
    return undefined;
  }

  const tareException = exceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === WEIGHING.toString() &&
      exception['Attribute Name'] === TARE.toString(),
  );

  return isTareApprovedException(tareException) ? tareException : undefined;
};

export const getContainerCapacityExceptionFromAccreditationDocument = (
  recyclerAccreditationDocument: Document,
): ContainerCapacityApprovedException | undefined => {
  const exceptions = getApprovedExceptions(recyclerAccreditationDocument);

  if (!exceptions) {
    return undefined;
  }

  const containerCapacityException = exceptions.find(
    (exception) =>
      exception['Attribute Location'].Event === WEIGHING.toString() &&
      exception['Attribute Name'] === CONTAINER_CAPACITY.toString(),
  );

  return isContainerCapacityApprovedException(containerCapacityException)
    ? containerCapacityException
    : undefined;
};

export const isExceptionValid = (
  exception:
    | ContainerCapacityApprovedException
    | TareApprovedException
    | undefined,
): boolean => {
  const isValidException =
    isTareApprovedException(exception) ||
    isContainerCapacityApprovedException(exception);

  if (!isValidException) {
    return false;
  }

  const validUntil = exception['Valid Until'];

  if (!validUntil) {
    return true;
  }

  const validUntilDate = parseISO(validUntil);

  if (!isValid(validUntilDate)) {
    return false;
  }

  return !isAfter(new Date(), validUntilDate);
};

export const getAccreditationScaleType = (
  recyclerAccreditationDocument: Document,
): MethodologyDocumentEventAttributeValue | undefined => {
  const monitoringSystemsAndEquipmentEvent =
    recyclerAccreditationDocument.externalEvents?.find(
      eventNameIsAnyOf([MONITORING_SYSTEMS_AND_EQUIPMENT]),
    );

  return getEventAttributeValue(monitoringSystemsAndEquipmentEvent, SCALE_TYPE);
};

export const getValuesRelatedToWeighing = (
  weighingEvent: DocumentEvent,
  recyclerAccreditationDocument: Document,
): WeighingValues => ({
  accreditationScaleType: getAccreditationScaleType(
    recyclerAccreditationDocument,
  ),
  containerCapacityAttribute: getEventAttributeByName(
    weighingEvent,
    CONTAINER_CAPACITY,
  ),
  containerCapacityException:
    getContainerCapacityExceptionFromAccreditationDocument(
      recyclerAccreditationDocument,
    ),
  containerQuantity: getEventAttributeValue(weighingEvent, CONTAINER_QUANTITY),
  containerType: getEventAttributeValue(
    weighingEvent,
    CONTAINER_TYPE,
  )?.toString(),
  description: getEventAttributeValue(weighingEvent, DESCRIPTION),
  eventValue: weighingEvent.value,
  grossWeight: getEventAttributeByName(weighingEvent, GROSS_WEIGHT),
  scaleType: getEventAttributeValue(weighingEvent, SCALE_TYPE),
  tare: getEventAttributeByName(weighingEvent, TARE),
  tareException: getTareExceptionFromAccreditationDocument(
    recyclerAccreditationDocument,
  ),
  vehicleLicensePlateAttribute: getEventAttributeByName(
    weighingEvent,
    VEHICLE_LICENSE_PLATE,
  ),
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

type Validator = (
  values: WeighingValues,
  isTwoStep?: boolean,
) => { errors: string[] };

const validators: Record<string, Validator> = {
  containerCapacity: (values) => {
    if (isExceptionValid(values.containerCapacityException)) {
      return { errors: [] };
    }

    const errors: string[] = [];

    if (!hasPositiveFloatAttributeValue(values.containerCapacityAttribute)) {
      errors.push(WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_CAPACITY);
    }

    if (!hasValidAttributeFormat(values.containerCapacityAttribute)) {
      errors.push(INVALID_RESULT_COMMENTS.CONTAINER_CAPACITY_FORMAT);
    }

    return { errors };
  },

  containerQuantity: (values) => {
    const errors: string[] = [];
    const isTruck = isTruckContainer(values);

    if (isTruck && isNonZeroPositiveInt(values.containerQuantity)) {
      errors.push(INVALID_RESULT_COMMENTS.CONTAINER_QUANTITY);
    }

    if (!isTruck && !isNonZeroPositiveInt(values.containerQuantity)) {
      errors.push(WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_QUANTITY);
    }

    return { errors };
  },

  containerType: (values, isTwoStep) => {
    if (!values.containerType) {
      return { errors: [WRONG_FORMAT_RESULT_COMMENTS.CONTAINER_TYPE] };
    }

    if (
      isTwoStep === true &&
      values.containerType !== DocumentEventContainerType.TRUCK.toString()
    ) {
      return {
        errors: [
          INVALID_RESULT_COMMENTS.TWO_STEP_CONTAINER_TYPE(values.containerType),
        ],
      };
    }

    return { errors: [] };
  },

  description: (values) =>
    isNonEmptyString(values.description)
      ? { errors: [] }
      : { errors: [WRONG_FORMAT_RESULT_COMMENTS.DESCRIPTION] },

  eventValue: (values) => {
    const errors: string[] = [];

    if (!isNonZeroPositive(values.eventValue)) {
      errors.push(WRONG_FORMAT_RESULT_COMMENTS.EVENT_VALUE(values.eventValue));
    }

    return { errors };
  },

  grossWeight: (values) => {
    const errors: string[] = [];

    if (
      shouldSkipValidationWithTareException(
        values,
        isAttributeOmitted(values.grossWeight),
      )
    ) {
      return { errors: [] };
    }

    if (!hasPositiveFloatAttributeValue(values.grossWeight)) {
      errors.push(
        WRONG_FORMAT_RESULT_COMMENTS.GROSS_WEIGHT(values.grossWeight?.value),
      );
    }

    if (!hasValidAttributeFormat(values.grossWeight)) {
      errors.push(INVALID_RESULT_COMMENTS.GROSS_WEIGHT_FORMAT);
    }

    return { errors };
  },

  netWeightCalculation: (values) => {
    if (shouldSkipNetWeightCalculationWithTareException(values)) {
      return { errors: [] };
    }

    if (
      isNil(values.grossWeight?.value) ||
      isNil(values.tare?.value) ||
      isNil(values.containerQuantity) ||
      isNil(values.eventValue) ||
      values.eventValue === 0
    ) {
      return { errors: [] };
    }

    const massNetWeight = Number(values.eventValue);
    const grossWeight = Number(values.grossWeight.value);
    const tare = Number(values.tare.value);
    const containerQuantity = Number(values.containerQuantity);

    const calculatedNetWeight = grossWeight - tare * containerQuantity;
    const diff = Math.abs(calculatedNetWeight - massNetWeight);

    if (diff > NET_WEIGHT_CALCULATION_TOLERANCE) {
      return {
        errors: [
          INVALID_RESULT_COMMENTS.NET_WEIGHT_CALCULATION({
            calculatedNetWeight,
            containerQuantity,
            eventValue: values.eventValue,
            grossWeight,
            tare,
          }),
        ],
      };
    }

    return { errors: [] };
  },

  scaleType: (values, isTwoStep) => {
    const errors: string[] = [];

    if (!isNonEmptyString(values.accreditationScaleType)) {
      return { errors: [NOT_FOUND_RESULT_COMMENTS.ACCREDITATION_EVENT] };
    }

    if (String(values.scaleType) !== String(values.accreditationScaleType)) {
      errors.push(
        INVALID_RESULT_COMMENTS.SCALE_TYPE_MISMATCH(
          values.scaleType,
          values.accreditationScaleType,
        ),
      );
    }

    if (!is<DocumentEventScaleType>(values.scaleType)) {
      errors.push(INVALID_RESULT_COMMENTS.SCALE_TYPE(values.scaleType));
    }

    if (
      isTwoStep === true &&
      values.scaleType !== DocumentEventScaleType.WEIGHBRIDGE
    ) {
      errors.push(
        INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE(
          values.scaleType,
        ),
      );
    }

    return { errors };
  },

  tare: (values) => {
    const errors: string[] = [];

    if (
      shouldSkipValidationWithTareException(
        values,
        isAttributeOmitted(values.tare),
      )
    ) {
      return { errors: [] };
    }

    if (!hasPositiveFloatAttributeValue(values.tare)) {
      errors.push(WRONG_FORMAT_RESULT_COMMENTS.TARE(values.tare?.value));
    }

    if (!hasValidAttributeFormat(values.tare)) {
      errors.push(INVALID_RESULT_COMMENTS.TARE_FORMAT);
    }

    return { errors };
  },

  vehicleLicensePlate: (values) => {
    const errors: string[] = [];
    const attribute = values.vehicleLicensePlateAttribute;

    if (!isValidLicensePlate(attribute?.value)) {
      errors.push(INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_FORMAT);
    }

    if (attribute?.sensitive !== true) {
      errors.push(INVALID_RESULT_COMMENTS.VEHICLE_LICENSE_PLATE_SENSITIVE);
    }

    return { errors };
  },

  weighingCaptureMethod: (values) => {
    if (is<DocumentEventWeighingCaptureMethod>(values.weighingCaptureMethod)) {
      return { errors: [] };
    }

    return {
      errors: [
        INVALID_RESULT_COMMENTS.WEIGHING_CAPTURE_METHOD(
          values.weighingCaptureMethod,
        ),
      ],
    };
  },
};

export const validateWeighingValues = (
  values: WeighingValues,
  isTwoStepWeighingEvent: boolean | undefined,
): ValidationResult => {
  const results: ValidationResult = { errors: [] };

  for (const validator of Object.values(validators)) {
    results.errors.push(...validator(values, isTwoStepWeighingEvent).errors);
  }

  return results;
};

export const validateTwoStepWeighingEvents = (
  events: DocumentEvent[],
): ValidationResult => {
  const errors: string[] = [];
  const firstEvent = events[0];
  const secondEvent = events[1];

  if (firstEvent?.participant.id !== secondEvent?.participant.id) {
    errors.push(
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
      errors.push(
        INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
          attributeName,
          firstValue,
          secondValue,
        }),
      );
    }
  }

  return { errors };
};
