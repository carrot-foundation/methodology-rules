import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';

import {
  type BaseExtractedData,
  type ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';
import {
  getTimezoneFromAddress,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { type DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  DocumentManifestEventSubject,
  LayoutValidationConfig,
} from './document-manifest-data.helpers';

import { buildCdfCrossValidationComparison } from './cross-validation-debug.helpers';
import {
  buildCrossValidationResponse,
  collectResults,
  computeCdfTotalKg,
  type CrossValidationResponse,
  type FieldValidationResult,
  getWasteClassification,
  matchWasteTypeEntry,
  routeByConfidence,
  validateBasicExtractedData,
  validateDateWithinPeriod,
  validateEntityAddress,
  validateEntityName,
  validateEntityTaxId,
  validateWasteQuantityDiscrepancy,
} from './cross-validation.helpers';
import {
  RESULT_COMMENTS,
  REVIEW_REASONS,
} from './document-manifest-data.constants';
import { getLayoutValidationConfig } from './document-manifest-data.helpers';

export interface CdfCrossValidationEventData
  extends DocumentManifestEventSubject {
  documentCurrentValue: number;
  dropOffEvent: DocumentEvent | undefined;
  manifestType: 'cdf';
  mtrDocumentNumbers: string[];
  pickUpEvent: DocumentEvent | undefined;
  recyclerEvent: DocumentEvent | undefined;
  wasteGeneratorEvent: DocumentEvent | undefined;
  weighingEvents: DocumentEvent[];
}

const validateMtrNumberCrossReference = (
  extractedData: CdfExtractedData,
  mtrDocumentNumbers: string[],
  layoutValidationConfig: LayoutValidationConfig,
): FieldValidationResult[] => {
  if (!extractedData.transportManifests) {
    if (
      layoutValidationConfig.unsupportedFields?.includes(
        'transportManifests',
      ) === true
    ) {
      return [];
    }

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

const validateCdfTotalWeightVsDocumentValue = (
  extractedData: CdfExtractedData,
  documentCurrentValue: number,
): FieldValidationResult => {
  if (!extractedData.wasteEntries) {
    return {};
  }

  const { hasValidQuantity, totalKg } = computeCdfTotalKg(
    extractedData.wasteEntries.parsed,
  );

  if (!hasValidQuantity) {
    return {};
  }

  if (documentCurrentValue > totalKg) {
    return routeByConfidence(
      extractedData.wasteEntries.confidence,
      REVIEW_REASONS.CDF_TOTAL_WEIGHT_LESS_THAN_DOCUMENT_VALUE({
        documentCurrentValue,
        extractedTotalKg: totalKg,
      }),
    );
  }

  return {};
};

const validateCdfWasteType = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
  layoutValidationConfig: LayoutValidationConfig,
): FieldValidationResult => {
  if (
    layoutValidationConfig.unsupportedValidations?.includes('wasteType') ===
    true
  ) {
    return {};
  }

  if (!extractedData.wasteEntries) {
    return eventData.pickUpEvent === undefined
      ? {}
      : {
          reviewReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
            context: 'Pick-up event',
            field: 'waste type entries',
          }),
        };
  }

  if (!eventData.pickUpEvent) {
    return {};
  }

  const { code: eventCode, description: eventDescription } =
    getWasteClassification(eventData.pickUpEvent);

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
  if (!extractedData.wasteEntries || !eventData.pickUpEvent) {
    return {};
  }

  const { code: eventCode, description: eventDescription } =
    getWasteClassification(eventData.pickUpEvent);

  return validateWasteQuantityDiscrepancy(
    extractedData.wasteEntries.parsed,
    eventCode,
    eventDescription,
    eventData.weighingEvents,
    REVIEW_REASONS.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH,
  );
};

export const isCdfEventData = (
  eventData: DocumentManifestEventSubject,
): eventData is CdfCrossValidationEventData =>
  'manifestType' in eventData &&
  (eventData as { manifestType: unknown }).manifestType === 'cdf';

export const collectMtrDocumentNumbers = (
  documentManifestEvents: DocumentManifestEventSubject[],
): string[] =>
  documentManifestEvents
    .filter((e) => e.documentType?.toString() === 'MTR')
    .map((e) => e.documentNumber?.toString())
    .filter((value): value is string => isNonEmptyString(value));

const buildCdfPassMessage = (
  extractedData: CdfExtractedData,
  eventData: CdfCrossValidationEventData,
): string | undefined => {
  if (!extractedData.wasteEntries) {
    return undefined;
  }

  const { hasValidQuantity, totalKg } = computeCdfTotalKg(
    extractedData.wasteEntries.parsed,
  );

  if (!hasValidQuantity) {
    return undefined;
  }

  return RESULT_COMMENTS.VALID_ATTACHMENT_DECLARATION({
    documentNumber: eventData.documentNumber?.toString() ?? '',
    documentType: eventData.documentType?.toString() ?? '',
    issueDate: eventData.issueDateAttribute?.value?.toString() ?? '',
    value: totalKg,
  });
};

export const validateCdfExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventData: CdfCrossValidationEventData,
): CrossValidationResponse => {
  const basicResult = validateBasicExtractedData(extractionResult, eventData);

  if (basicResult.reviewRequired === true) {
    return basicResult;
  }

  const extractedData = extractionResult.data as CdfExtractedData;
  const layoutValidationConfig = getLayoutValidationConfig(
    extractionResult.layoutId,
  );

  const crossValidation = buildCdfCrossValidationComparison(
    extractedData,
    eventData,
    extractionResult.data.extractionConfidence,
    layoutValidationConfig,
  );

  const { failReasons, reviewReasons: fieldReviewReasons } = collectResults([
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
      getTimezoneFromAddress(
        eventData.dropOffEvent?.address.countryCode ?? 'BR',
        eventData.dropOffEvent?.address.countryState,
      ),
    ),
    validateCdfTotalWeightVsDocumentValue(
      extractedData,
      eventData.documentCurrentValue,
    ),
    validateCdfWasteType(extractedData, eventData, layoutValidationConfig),
    validateCdfWasteQuantity(extractedData, eventData),
    ...validateMtrNumberCrossReference(
      extractedData,
      eventData.mtrDocumentNumbers,
      layoutValidationConfig,
    ),
  ]);

  const passMessage =
    failReasons.length === 0
      ? buildCdfPassMessage(extractedData, eventData)
      : undefined;

  return buildCrossValidationResponse(
    basicResult,
    fieldReviewReasons,
    failReasons,
    crossValidation,
    passMessage,
  );
};
