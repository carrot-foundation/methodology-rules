import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import { isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';

import { buildCdfCrossValidationComparison } from './cross-validation-debug.helpers';
import {
  collectResults,
  type FieldValidationResult,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  validateBasicExtractedData,
  validateDateWithinPeriod,
  validateEntityAddress,
  validateEntityName,
  validateEntityTaxId,
  WEIGHT_DISCREPANCY_THRESHOLD,
} from './cross-validation.helpers';
import { REVIEW_REASONS } from './document-manifest-data.constants';

const {
  LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  LOCAL_WASTE_CLASSIFICATION_ID,
} = DocumentEventAttributeName;

export interface CdfCrossValidationEventData
  extends DocumentManifestEventSubject {
  dropOffEvent: DocumentEvent | undefined;
  mtrDocumentNumbers: string[];
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const validateMtrNumberCrossReference = (
  extractedData: CdfExtractedData,
  mtrDocumentNumbers: string[],
): FieldValidationResult[] => {
  if (!extractedData.transportManifests) {
    return mtrDocumentNumbers.length > 0
      ? [
          {
            reviewReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
              context: 'MTR document numbers',
              field: 'transport manifest numbers',
            }),
          },
        ]
      : [];
  }

  if (mtrDocumentNumbers.length === 0) {
    return [];
  }

  const extractedManifests = extractedData.transportManifests.parsed;
  const results: FieldValidationResult[] = [];

  for (const mtrNumber of mtrDocumentNumbers) {
    const found = extractedManifests.some(
      (manifest) =>
        manifest.includes(mtrNumber) || mtrNumber.includes(manifest),
    );

    if (!found) {
      results.push({
        reviewReason: {
          ...REVIEW_REASONS.MTR_NUMBER_NOT_IN_CDF({ mtrNumber }),
          comparedFields: [
            {
              event: mtrNumber,
              extracted: extractedManifests.join(', '),
              field: 'mtrNumber',
            },
          ],
        },
      });
    }
  }

  return results;
};

const validateCdfWasteType = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
): FieldValidationResult => {
  if (!extractedData.wasteEntries) {
    return eventData.dropOffEvent === undefined
      ? {}
      : {
          reviewReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
            context: 'Drop-off event',
            field: 'waste type entries',
          }),
        };
  }

  if (!eventData.dropOffEvent) {
    return {};
  }

  const eventCode = getEventAttributeValue(
    eventData.dropOffEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  )?.toString();

  const eventDescription = getEventAttributeValue(
    eventData.dropOffEvent,
    LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  )?.toString();

  if (!eventCode && !eventDescription) {
    return {};
  }

  const entries = extractedData.wasteEntries.parsed;
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
    reviewReason: {
      ...REVIEW_REASONS.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH({
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

const validateCdfWasteQuantity = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
): FieldValidationResult => {
  if (!extractedData.wasteEntries || !eventData.dropOffEvent) {
    return {};
  }

  const eventCode = getEventAttributeValue(
    eventData.dropOffEvent,
    LOCAL_WASTE_CLASSIFICATION_ID,
  )?.toString();

  const eventDescription = getEventAttributeValue(
    eventData.dropOffEvent,
    LOCAL_WASTE_CLASSIFICATION_DESCRIPTION,
  )?.toString();

  const entries = extractedData.wasteEntries.parsed;
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
      reviewReason: {
        ...REVIEW_REASONS.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH({
          discrepancyPercentage: (discrepancy * 100).toFixed(1),
          extractedQuantity: matchedEntry.quantity.toString(),
          unit: matchedEntry.unit ?? 'kg',
          weighingWeight: weighingValue.toString(),
        }),
        comparedFields: [
          {
            event: `${weighingValue} kg`,
            extracted: `${matchedEntry.quantity} ${matchedEntry.unit ?? 'kg'}`,
            field: 'wasteQuantity',
            similarity: `${(discrepancy * 100).toFixed(1)}% discrepancy`,
          },
        ],
      },
    };
  }

  return {};
};

export const isCdfEventData = (
  eventData: DocumentManifestEventSubject,
): eventData is CdfCrossValidationEventData =>
  'mtrDocumentNumbers' in eventData;

export const collectMtrDocumentNumbers = (
  documentManifestEvents: DocumentManifestEventSubject[],
): string[] =>
  documentManifestEvents
    .filter((e) => e.documentType?.toString() === 'MTR')
    .map((e) => e.documentNumber?.toString())
    .filter((value): value is string => isNonEmptyString(value));

export const validateCdfExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: CdfCrossValidationEventData,
): ValidationResult & {
  crossValidation?: Record<string, unknown>;
  failReasons?: import('@carrot-fndn/shared/document-extractor').ReviewReason[];
  reviewReasons?: import('@carrot-fndn/shared/document-extractor').ReviewReason[];
} => {
  const basicResult = validateBasicExtractedData(extractionResult, eventData);

  if (basicResult.reviewRequired === true) {
    return basicResult;
  }

  const extractedData = extractionResult.data as CdfExtractedData;

  const crossValidation = buildCdfCrossValidationComparison(
    extractedData,
    eventData,
    extractionResult.data.extractionConfidence,
  );

  const { failReasons, reviewReasons } = collectResults([
    validateEntityName(
      extractedData.recycler,
      eventData.recyclerEvent?.participant.name,
      REVIEW_REASONS.RECYCLER_NAME_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'recycler name',
      }),
    ),
    validateEntityTaxId(
      extractedData.recycler,
      eventData.recyclerEvent?.participant.taxId,
      REVIEW_REASONS.RECYCLER_TAX_ID_MISMATCH,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'recycler tax ID',
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
    validateDateWithinPeriod(
      eventData.dropOffEvent?.externalCreatedAt,
      extractedData.processingPeriod,
      REVIEW_REASONS.DROP_OFF_DATE_OUTSIDE_PERIOD,
      REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Drop-off event date',
        field: 'processing period',
      }),
    ),
    validateCdfWasteType(extractedData, eventData),
    validateCdfWasteQuantity(extractedData, eventData),
    ...validateMtrNumberCrossReference(
      extractedData,
      eventData.mtrDocumentNumbers,
    ),
  ]);

  const allFailMessages = [
    ...basicResult.failMessages,
    ...failReasons.map((r) => r.description),
  ];

  if (failReasons.length > 0 || reviewReasons.length > 0) {
    return {
      crossValidation,
      failMessages: allFailMessages,
      failReasons,
      reviewReasons,
      reviewRequired: reviewReasons.length > 0,
    };
  }

  return {
    crossValidation,
    failMessages: allFailMessages,
    reviewRequired: false,
  };
};
