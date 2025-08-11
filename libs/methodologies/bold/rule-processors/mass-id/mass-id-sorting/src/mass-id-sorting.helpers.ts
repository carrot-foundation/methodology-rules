import {
  isNonEmptyArray,
  isNonZeroPositive,
} from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeByName,
  getEventAttributeValue,
  getLastYearEmissionAndCompostingMetricsEvent,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  type DocumentEventAttribute,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventAttributeFormat } from '@carrot-fndn/shared/types';
import { getYear } from 'date-fns';

const { SORTING } = DocumentEventName;
const { DEDUCTED_WEIGHT, DESCRIPTION, GROSS_WEIGHT, SORTING_FACTOR } =
  DocumentEventAttributeName;

export enum ValidationErrorCode {
  EVENT_BEFORE_SORTING_UNDEFINED = 'EVENT_BEFORE_SORTING_UNDEFINED',
  INVALID_DEDUCTED_WEIGHT = 'INVALID_DEDUCTED_WEIGHT',
  INVALID_DEDUCTED_WEIGHT_FORMAT = 'INVALID_DEDUCTED_WEIGHT_FORMAT',
  INVALID_GROSS_WEIGHT = 'INVALID_GROSS_WEIGHT',
  INVALID_GROSS_WEIGHT_FORMAT = 'INVALID_GROSS_WEIGHT_FORMAT',
  INVALID_VALUE_AFTER_SORTING = 'INVALID_VALUE_AFTER_SORTING',
  INVALID_VALUE_BEFORE_SORTING = 'INVALID_VALUE_BEFORE_SORTING',
  INVALID_WEIGHT_COMPARISON = 'INVALID_WEIGHT_COMPARISON',
  MISSING_EXTERNAL_EVENTS = 'MISSING_EXTERNAL_EVENTS',
  MISSING_SORTING_EVENT = 'MISSING_SORTING_EVENT',
  MISSING_SORTING_FACTOR = 'MISSING_SORTING_FACTOR',
}

export interface EventValues {
  valueAfterSorting: number;
  valueBeforeSorting: number;
}

export interface SortingCalculations {
  calculatedSortingValue: number;
  deductedWeight: number;
  grossWeight: number;
  sortingValueCalculationDifference: number;
}

export interface SortingEvents {
  eventBeforeSorting: DocumentEvent | undefined;
  sortingEvent: DocumentEvent;
}

export interface ValidationError {
  code: ValidationErrorCode;
  isError: true;
}

export interface WeightAttributes {
  deductedWeight: number;
  grossWeight: number;
}

export const isValidationError = (result: unknown): result is ValidationError =>
  typeof result === 'object' && result !== null && 'isError' in result;

export const calculateSortingValues = (
  weightAttributes: WeightAttributes,
  valueAfterSorting: number,
): SortingCalculations => {
  const { deductedWeight, grossWeight } = weightAttributes;
  const calculatedSortingValue = grossWeight - deductedWeight;
  const sortingValueCalculationDifference = Math.abs(
    calculatedSortingValue - Number(valueAfterSorting),
  );

  return {
    calculatedSortingValue,
    deductedWeight,
    grossWeight,
    sortingValueCalculationDifference,
  };
};

export const findSortingEvents = (
  externalEvents: DocumentEvent[],
): SortingEvents | ValidationError => {
  const sortingEventIndex = externalEvents.findIndex(
    eventNameIsAnyOf([SORTING]),
  );

  if (sortingEventIndex === -1) {
    return {
      code: ValidationErrorCode.MISSING_SORTING_EVENT,
      isError: true,
    };
  }

  const sortingEvent = externalEvents[sortingEventIndex]!;
  const eventBeforeSorting = externalEvents[sortingEventIndex - 1];

  return { eventBeforeSorting, sortingEvent };
};

export const getSortingDescription = (sortingEvent: DocumentEvent) =>
  getEventAttributeValue(sortingEvent, DESCRIPTION);

export const getSortingFactor = (
  recyclerAccreditationDocument: Document,
  massIdDocument: Document,
): number | ValidationError => {
  const emissionAndCompostingMetricsEvent =
    getLastYearEmissionAndCompostingMetricsEvent({
      documentWithEmissionAndCompostingMetricsEvent:
        recyclerAccreditationDocument,
      documentYear: getYear(massIdDocument.externalCreatedAt),
    });

  const sortingFactor = getEventAttributeValue(
    emissionAndCompostingMetricsEvent,
    SORTING_FACTOR,
  );

  if (!isNonZeroPositive(sortingFactor)) {
    return {
      code: ValidationErrorCode.MISSING_SORTING_FACTOR,
      isError: true,
    };
  }

  return Number(sortingFactor);
};

export const getValidatedEventValues = (
  eventBeforeSorting: DocumentEvent | undefined,
  sortingEvent: DocumentEvent,
): EventValues | ValidationError => {
  if (!eventBeforeSorting) {
    return {
      code: ValidationErrorCode.EVENT_BEFORE_SORTING_UNDEFINED,
      isError: true,
    };
  }

  const valueBeforeSorting = eventBeforeSorting.value;
  const valueAfterSorting = sortingEvent.value;

  if (!isNonZeroPositive(valueBeforeSorting)) {
    return {
      code: ValidationErrorCode.INVALID_VALUE_BEFORE_SORTING,
      isError: true,
    };
  }

  if (!isNonZeroPositive(valueAfterSorting)) {
    return {
      code: ValidationErrorCode.INVALID_VALUE_AFTER_SORTING,
      isError: true,
    };
  }

  return {
    valueAfterSorting,
    valueBeforeSorting,
  };
};

export const getValidatedExternalEvents = (
  massIdDocument: Document,
): DocumentEvent[] | ValidationError => {
  if (!isNonEmptyArray(massIdDocument.externalEvents)) {
    return {
      code: ValidationErrorCode.MISSING_EXTERNAL_EVENTS,
      isError: true,
    };
  }

  return massIdDocument.externalEvents;
};

export const getValidatedWeightAttributes = (
  sortingEvent: DocumentEvent,
): ValidationError | WeightAttributes => {
  const grossWeightAttribute = getEventAttributeByName(
    sortingEvent,
    GROSS_WEIGHT,
  );
  const deductedWeightAttribute = getEventAttributeByName(
    sortingEvent,
    DEDUCTED_WEIGHT,
  );

  const grossWeightError = validateWeightAttribute(
    grossWeightAttribute,
    'gross',
  );

  if (grossWeightError) {
    return grossWeightError;
  }

  const deductedWeightError = validateWeightAttribute(
    deductedWeightAttribute,
    'deducted',
  );

  if (deductedWeightError) {
    return deductedWeightError;
  }

  const grossWeight = Number(grossWeightAttribute?.value);
  const deductedWeight = Number(deductedWeightAttribute?.value);

  if (deductedWeight >= grossWeight) {
    return {
      code: ValidationErrorCode.INVALID_WEIGHT_COMPARISON,
      isError: true,
    };
  }

  return {
    deductedWeight,
    grossWeight,
  };
};

export const validateWeightAttribute = (
  attribute: DocumentEventAttribute | undefined,
  weightType: 'deducted' | 'gross',
): null | ValidationError => {
  if (!isNonZeroPositive(attribute?.value)) {
    return {
      code:
        weightType === 'gross'
          ? ValidationErrorCode.INVALID_GROSS_WEIGHT
          : ValidationErrorCode.INVALID_DEDUCTED_WEIGHT,
      isError: true,
    };
  }

  if (attribute.format !== MethodologyDocumentEventAttributeFormat.KILOGRAM) {
    return {
      code:
        weightType === 'gross'
          ? ValidationErrorCode.INVALID_GROSS_WEIGHT_FORMAT
          : ValidationErrorCode.INVALID_DEDUCTED_WEIGHT_FORMAT,
      isError: true,
    };
  }

  return null;
};
