import type {
  MtrExtractedData,
  WasteTypeEntry,
} from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import {
  dateDifferenceInDays,
  isNameMatch,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';

import { logCrossValidationComparison } from './cross-validation-debug.helpers';
import {
  collectResults,
  type FieldValidationResult,
  routeByConfidence,
  validateBasicExtractedData,
  validateEntityName,
  validateEntityTaxId,
} from './cross-validation.helpers';
import { CROSS_VALIDATION_COMMENTS } from './document-manifest-data.constants';

export interface MtrCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const DATE_TOLERANCE_DAYS = 3;

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  VEHICLE_LICENSE_PLATE,
} = DocumentEventAttributeName;

const validateVehiclePlate = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!pickUpEvent || !extractedData.vehiclePlate) {
    return {};
  }

  const eventPlate = getEventAttributeValue(
    pickUpEvent,
    VEHICLE_LICENSE_PLATE,
  )?.toString();

  if (!eventPlate) {
    return {};
  }

  const normalizedEventPlate = normalizeVehiclePlate(eventPlate);
  const normalizedExtractedPlate = normalizeVehiclePlate(
    extractedData.vehiclePlate.parsed,
  );

  if (normalizedEventPlate === normalizedExtractedPlate) {
    return {};
  }

  const message = CROSS_VALIDATION_COMMENTS.VEHICLE_PLATE_MISMATCH({
    eventPlate,
    extractedPlate: extractedData.vehiclePlate.parsed,
  });

  return routeByConfidence(extractedData.vehiclePlate.confidence, message);
};

const validateDateField = (
  extractedDate: MtrExtractedData['transportDate'],
  eventDateString: string | undefined,
  commentFunction: (parameters: {
    daysDiff: number;
    eventDate: string;
    extractedDate: string;
  }) => string,
): FieldValidationResult => {
  if (!extractedDate || !eventDateString) {
    return {};
  }

  if (extractedDate.confidence !== 'high') {
    return {};
  }

  const daysDiff = dateDifferenceInDays(extractedDate.parsed, eventDateString);

  if (daysDiff === undefined || daysDiff === 0) {
    return {};
  }

  const message = commentFunction({
    daysDiff,
    eventDate: eventDateString,
    extractedDate: extractedDate.parsed,
  });

  return daysDiff > DATE_TOLERANCE_DAYS
    ? { failMessage: message }
    : { reviewReason: message };
};

export const WEIGHT_DISCREPANCY_THRESHOLD = 0.1;

export const normalizeQuantityToKg = (
  quantity: number,
  unit: string | undefined,
): number | undefined => {
  if (unit === undefined) {
    return quantity;
  }

  const normalized = unit.toLowerCase();

  if (normalized === 'kg') {
    return quantity;
  }

  if (normalized === 'ton' || normalized === 't') {
    return quantity * 1000;
  }

  return undefined;
};

const normalizeWasteCode = (code: string): string =>
  code.replaceAll(/\s+/g, '').toLowerCase();

interface WasteTypeMatchResult {
  descriptionSimilarity: null | number;
  isCodeMatch: boolean | null;
  isMatch: boolean;
}

export const matchWasteTypeEntry = (
  entry: WasteTypeEntry,
  eventCode: string | undefined,
  eventDescription: string | undefined,
): WasteTypeMatchResult => {
  if (entry.code && eventCode && eventCode.length > 0) {
    const isCodeMatch =
      normalizeWasteCode(eventCode) === normalizeWasteCode(entry.code);

    if (!isCodeMatch || eventDescription === undefined) {
      return { descriptionSimilarity: null, isCodeMatch, isMatch: false };
    }

    const { isMatch, score } = isNameMatch(entry.description, eventDescription);

    return { descriptionSimilarity: score, isCodeMatch, isMatch };
  }

  if (eventDescription) {
    const { isMatch, score } = isNameMatch(entry.description, eventDescription);

    return { descriptionSimilarity: score, isCodeMatch: null, isMatch };
  }

  return { descriptionSimilarity: null, isCodeMatch: null, isMatch: false };
};

const validateWasteQuantity = (
  extractedData: MtrExtractedData,
  eventData: MtrCrossValidationEventData,
): FieldValidationResult => {
  if (!extractedData.wasteTypes || !eventData.pickUpEvent) {
    return {};
  }

  const eventCode = getEventAttributeValue(
    eventData.pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  )?.toString();

  const eventDescription = getEventAttributeValue(
    eventData.pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  )?.toString();

  const entries = extractedData.wasteTypes.parsed;
  const matchedEntry = entries.find(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (matchedEntry?.quantity === undefined || matchedEntry.quantity === 0) {
    return {};
  }

  const extractedQuantityKg = normalizeQuantityToKg(
    matchedEntry.quantity,
    matchedEntry.unit,
  );

  if (extractedQuantityKg === undefined) {
    return {};
  }

  const weighingEvent = eventData.weighingEvents.find(
    (event) => event.value !== undefined && event.value > 0,
  );

  if (!weighingEvent?.value) {
    return {};
  }

  const weighingValue = weighingEvent.value;
  const discrepancy =
    Math.abs(extractedQuantityKg - weighingValue) / weighingValue;

  if (discrepancy > WEIGHT_DISCREPANCY_THRESHOLD) {
    return {
      reviewReason: CROSS_VALIDATION_COMMENTS.WASTE_QUANTITY_WEIGHT_MISMATCH({
        discrepancyPercentage: (discrepancy * 100).toFixed(1),
        extractedQuantity: matchedEntry.quantity.toString(),
        unit: matchedEntry.unit ?? 'kg',
        weighingWeight: weighingValue.toString(),
      }),
    };
  }

  return {};
};

const validateWasteType = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!pickUpEvent || !extractedData.wasteTypes) {
    return {};
  }

  const eventCode = getEventAttributeValue(
    pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  )?.toString();

  const eventDescription = getEventAttributeValue(
    pickUpEvent,
    LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  )?.toString();

  if (!eventCode && !eventDescription) {
    return {};
  }

  const entries = extractedData.wasteTypes.parsed;
  const hasMatch = entries.some(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (hasMatch) {
    return {};
  }

  const extractedSummary = entries
    .map((e) => (e.code ? `${e.code} - ${e.description}` : e.description))
    .join(', ');

  // istanbul ignore next -- eventDescription is guaranteed to be defined when eventCode is absent (early return above)
  const eventSummary = eventCode
    ? `${eventCode} - ${eventDescription ?? ''}`
    : (eventDescription ?? '');

  return {
    reviewReason: CROSS_VALIDATION_COMMENTS.WASTE_TYPE_MISMATCH({
      eventClassification: eventSummary,
      extractedEntries: extractedSummary,
    }),
  };
};

export const validateMtrExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: MtrCrossValidationEventData,
): ValidationResult & { reviewReasons?: string[] } => {
  const basicResult = validateBasicExtractedData(extractionResult, eventData);

  if (basicResult.reviewRequired === true) {
    return basicResult;
  }

  const extractedData = extractionResult.data as MtrExtractedData;

  logCrossValidationComparison(
    extractedData,
    eventData,
    extractionResult.data.extractionConfidence,
  );

  const { failMessages, reviewReasons } = collectResults([
    validateVehiclePlate(extractedData, eventData.pickUpEvent),
    validateEntityName(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.RECEIVER_NAME_MISMATCH,
    ),
    validateEntityTaxId(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.RECEIVER_TAX_ID_MISMATCH,
    ),
    validateEntityName(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.GENERATOR_NAME_MISMATCH,
    ),
    validateEntityTaxId(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.GENERATOR_TAX_ID_MISMATCH,
    ),
    validateEntityName(
      extractedData.hauler,
      eventData.haulerEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.HAULER_NAME_MISMATCH,
    ),
    validateEntityTaxId(
      extractedData.hauler,
      eventData.haulerEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.HAULER_TAX_ID_MISMATCH,
    ),
    validateDateField(
      extractedData.transportDate,
      eventData.pickUpEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.TRANSPORT_DATE_MISMATCH,
    ),
    validateDateField(
      extractedData.receivingDate,
      eventData.dropOffEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.RECEIVING_DATE_MISMATCH,
    ),
    validateWasteType(extractedData, eventData.pickUpEvent),
    validateWasteQuantity(extractedData, eventData),
  ]);

  const allFailMessages = [...basicResult.failMessages, ...failMessages];

  if (reviewReasons.length > 0) {
    return {
      failMessages: allFailMessages,
      reviewReasons,
      reviewRequired: true,
    };
  }

  return {
    failMessages: allFailMessages,
    reviewRequired: false,
  };
};
