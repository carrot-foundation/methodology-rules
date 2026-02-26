import type { MtrExtractedData } from '@carrot-fndn/shared/document-extractor-transport-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import { toWasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import {
  getTimezoneFromAddress,
  normalizeVehiclePlate,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { DocumentManifestEventSubject } from './document-manifest-data.helpers';

import { buildCrossValidationComparison } from './cross-validation-debug.helpers';
import {
  buildCrossValidationResponse,
  collectResults,
  type CrossValidationResponse,
  type FieldValidationResult,
  getWasteClassification,
  matchWasteTypeEntry,
  routeByConfidence,
  validateBasicExtractedData,
  validateDateField,
  validateEntityAddress,
  validateEntityName,
  validateEntityTaxId,
  validateWasteQuantityDiscrepancy,
} from './cross-validation.helpers';
import { REVIEW_REASONS } from './document-manifest-data.constants';

export {
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  validateWasteQuantityDiscrepancy,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation.helpers';

export interface MtrCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  haulerEvent: DocumentEvent | undefined;
  manifestType: 'mtr';
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

const validateVehiclePlate = (
  extractedData: MtrExtractedData,
  pickUpEvent: DocumentEvent | undefined,
): FieldValidationResult => {
  if (!extractedData.vehiclePlate) {
    return pickUpEvent === undefined
      ? {}
      : {
          reviewReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
            field: 'vehicle plate',
          }),
        };
  }

  if (extractedData.vehiclePlate.confidence !== 'high') {
    return {};
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
    reviewReason: {
      ...REVIEW_REASONS.VEHICLE_PLATE_MISMATCH(),
      comparedFields: [
        {
          event: eventPlate,
          extracted: extractedData.vehiclePlate.parsed,
          field: 'vehiclePlate',
        },
      ],
    },
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

  const { code: eventCode, description: eventDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const entries = extractedData.wasteTypes.map((entry) =>
    toWasteTypeEntryData(entry),
  );

  return validateWasteQuantityDiscrepancy(
    entries,
    eventCode,
    eventDescription,
    eventData.weighingEvents,
    REVIEW_REASONS.WASTE_QUANTITY_WEIGHT_MISMATCH,
  );
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
          reviewReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
            field: 'waste type entries',
          }),
        };
  }

  if (!pickUpEvent) {
    return {};
  }

  const { code: eventCode, description: eventDescription } =
    getWasteClassification(pickUpEvent);

  if (!eventCode && !eventDescription) {
    return {};
  }

  const entries = extractedData.wasteTypes.map((entry) =>
    toWasteTypeEntryData(entry),
  );
  const meaningfulEntries = entries.filter((e) => e.code || e.description);

  if (meaningfulEntries.length === 0) {
    return routeByConfidence(
      extractedData.extractionConfidence,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        field: 'waste type entries',
      }),
    );
  }

  const hasMatch = meaningfulEntries.some(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (hasMatch) {
    return {};
  }

  const extractedSummary = meaningfulEntries
    .map((e) => (e.code ? `${e.code} - ${e.description}` : e.description))
    .join(', ');

  // istanbul ignore next -- eventDescription is guaranteed to be defined when eventCode is absent (early return above)
  const eventSummary = eventCode
    ? `${eventCode} - ${eventDescription ?? ''}`
    : (eventDescription ?? '');

  return {
    reviewReason: {
      ...REVIEW_REASONS.WASTE_TYPE_MISMATCH({
        eventClassification: eventSummary,
        extractedEntries: extractedSummary,
      }),
      comparedFields: [
        {
          event: eventSummary,
          extracted: extractedSummary,
          field: 'wasteType',
        },
      ],
    },
  };
};

export const validateMtrExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: MtrCrossValidationEventData,
): CrossValidationResponse => {
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

  const { failReasons, reviewReasons: fieldReviewReasons } = collectResults([
    validateVehiclePlate(extractedData, eventData.pickUpEvent),
    validateEntityName(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.name,
      REVIEW_REASONS.RECEIVER_NAME_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver name',
      }),
    ),
    validateEntityTaxId(
      extractedData.receiver,
      eventData.recyclerEvent?.participant.taxId,
      REVIEW_REASONS.RECEIVER_TAX_ID_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'receiver tax ID',
      }),
    ),
    validateEntityAddress(
      extractedData.receiver,
      eventData.recyclerEvent?.address,
      REVIEW_REASONS.RECEIVER_ADDRESS_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" event',
        field: 'receiver address',
      }),
    ),
    validateEntityName(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.name,
      REVIEW_REASONS.GENERATOR_NAME_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator name',
      }),
    ),
    validateEntityTaxId(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.participant.taxId,
      REVIEW_REASONS.GENERATOR_TAX_ID_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator tax ID',
      }),
    ),
    validateEntityAddress(
      extractedData.generator,
      eventData.wasteGeneratorEvent?.address,
      REVIEW_REASONS.GENERATOR_ADDRESS_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" event',
        field: 'generator address',
      }),
    ),
    validateEntityName(
      extractedData.hauler,
      eventData.haulerEvent?.participant.name,
      REVIEW_REASONS.HAULER_NAME_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler name',
      }),
    ),
    validateEntityTaxId(
      extractedData.hauler,
      eventData.haulerEvent?.participant.taxId,
      REVIEW_REASONS.HAULER_TAX_ID_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Hauler" participant',
        field: 'hauler tax ID',
      }),
    ),
    validateDateField(
      extractedData.transportDate,
      eventData.pickUpEvent?.externalCreatedAt,
      REVIEW_REASONS.TRANSPORT_DATE_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Pick-up event',
        field: 'transport date',
      }),
      getTimezoneFromAddress(
        eventData.pickUpEvent?.address.countryCode ?? 'BR',
        eventData.pickUpEvent?.address.countryState,
      ),
    ),
    validateDateField(
      extractedData.receivingDate,
      eventData.dropOffEvent?.externalCreatedAt,
      REVIEW_REASONS.RECEIVING_DATE_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Drop-off event',
        field: 'receiving date',
      }),
      getTimezoneFromAddress(
        eventData.dropOffEvent?.address.countryCode ?? 'BR',
        eventData.dropOffEvent?.address.countryState,
      ),
    ),
    validateWasteType(extractedData, eventData.pickUpEvent),
    validateWasteQuantity(extractedData, eventData),
  ]);

  return buildCrossValidationResponse(
    basicResult,
    fieldReviewReasons,
    failReasons,
    crossValidation,
  );
};
