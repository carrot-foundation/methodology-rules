import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import { toWasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import { normalizeVehiclePlate } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';

import { buildCrossValidationComparison } from './cross-validation-debug.helpers';
import {
  collectResults,
  type FieldValidationResult,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  validateBasicExtractedData,
  validateDateField,
  validateEntityAddress,
  validateEntityName,
  validateEntityTaxId,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation.helpers';
import { CROSS_VALIDATION_COMMENTS } from './document-manifest-data.constants';

export {
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation.helpers';

export interface MtrCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
  VEHICLE_LICENSE_PLATE,
} = DocumentEventAttributeName;

const NOT_EXTRACTED = CROSS_VALIDATION_COMMENTS.FIELD_NOT_EXTRACTED;

const validateVehiclePlate = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!extractedData.vehiclePlate) {
    return pickUpEvent === undefined
      ? {}
      : {
          reviewReason: CROSS_VALIDATION_COMMENTS.FIELD_NOT_EXTRACTED({
            field: 'vehicle plate',
          }),
        };
  }

  if (!pickUpEvent) {
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

  return {
    reviewReason: CROSS_VALIDATION_COMMENTS.VEHICLE_PLATE_MISMATCH,
  };
};

const validateWasteQuantity = (
  extractedData: MtrExtractedData,
  eventData: MtrCrossValidationEventData,
): FieldValidationResult => {
  if (
    extractedData.wasteTypes === undefined ||
    extractedData.wasteTypes.length === 0 ||
    !eventData.pickUpEvent
  ) {
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

  const entries = extractedData.wasteTypes.map((entry) =>
    toWasteTypeEntryData(entry),
  );
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
  if (
    extractedData.wasteTypes === undefined ||
    extractedData.wasteTypes.length === 0
  ) {
    return pickUpEvent === undefined
      ? {}
      : {
          reviewReason: CROSS_VALIDATION_COMMENTS.FIELD_NOT_EXTRACTED({
            field: 'waste type entries',
          }),
        };
  }

  if (!pickUpEvent) {
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

  const entries = extractedData.wasteTypes.map((entry) =>
    toWasteTypeEntryData(entry),
  );
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
): ValidationResult & {
  crossValidation?: Record<string, unknown>;
  reviewReasons?: string[];
} => {
  const basicResult = validateBasicExtractedData(extractionResult, eventData);

  if (basicResult.reviewRequired === true) {
    return basicResult;
  }

  const extractedData = extractionResult.data as MtrExtractedData;

  const crossValidation = buildCrossValidationComparison(
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
      NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver name',
      }),
    ),
    validateEntityTaxId(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.RECEIVER_TAX_ID_MISMATCH,
      NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver tax ID',
      }),
    ),
    validateEntityAddress(
      extractedData.receiver,
      eventData.recyclerEvent?.address,
      CROSS_VALIDATION_COMMENTS.RECEIVER_ADDRESS_MISMATCH,
      NOT_EXTRACTED({
        context: '"Recycler" event',
        field: 'receiver address',
      }),
    ),
    validateEntityName(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.GENERATOR_NAME_MISMATCH,
      NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator name',
      }),
    ),
    validateEntityTaxId(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.GENERATOR_TAX_ID_MISMATCH,
      NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator tax ID',
      }),
    ),
    validateEntityAddress(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.address,
      CROSS_VALIDATION_COMMENTS.GENERATOR_ADDRESS_MISMATCH,
      NOT_EXTRACTED({
        context: '"Waste Generator" event',
        field: 'generator address',
      }),
    ),
    validateEntityName(
      extractedData.hauler,
      eventData.haulerEvent?.participant.name,
      CROSS_VALIDATION_COMMENTS.HAULER_NAME_MISMATCH,
      NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler name',
      }),
    ),
    validateEntityTaxId(
      extractedData.hauler,
      eventData.haulerEvent?.participant.taxId,
      CROSS_VALIDATION_COMMENTS.HAULER_TAX_ID_MISMATCH,
      NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler tax ID',
      }),
    ),
    validateDateField(
      extractedData.transportDate,
      eventData.pickUpEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.TRANSPORT_DATE_MISMATCH,
      NOT_EXTRACTED({ context: 'Pick-up event', field: 'transport date' }),
    ),
    validateDateField(
      extractedData.receivingDate,
      eventData.dropOffEvent?.externalCreatedAt,
      CROSS_VALIDATION_COMMENTS.RECEIVING_DATE_MISMATCH,
      NOT_EXTRACTED({ context: 'Drop-off event', field: 'receiving date' }),
    ),
    validateWasteType(extractedData, eventData.pickUpEvent),
    validateWasteQuantity(extractedData, eventData),
  ]);

  const allFailMessages = [...basicResult.failMessages, ...failMessages];

  if (reviewReasons.length > 0) {
    return {
      crossValidation,
      failMessages: allFailMessages,
      reviewReasons,
      reviewRequired: true,
    };
  }

  return {
    crossValidation,
    failMessages: allFailMessages,
    reviewRequired: false,
  };
};
