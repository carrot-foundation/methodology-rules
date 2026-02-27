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

import type { DocumentManifestEventSubject } from './document-manifest-data.helpers';
import type { CdfCrossValidation } from './document-manifest-data.result-content.types';

import {
  compareCdfTotalWeight,
  compareDateField,
  compareEntity,
  compareMtrNumbers,
  comparePeriod,
  compareStringField,
  compareWasteQuantity,
  compareWasteType,
  type EntityComparisonReasons,
} from './cross-validation-comparators';
import {
  collectResults,
  computeCdfTotalKg,
  type CrossValidationResponse,
  getWasteClassification,
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
  const extractedData = extractionResult.data as CdfExtractedData;

  // Low-confidence early exit
  if (extractionResult.data.extractionConfidence === 'low') {
    return { failMessages: [], reviewRequired: true };
  }

  const layoutValidationConfig = getLayoutValidationConfig(
    extractionResult.layoutId,
  );

  const eventIssueDate = eventData.issueDateAttribute?.value?.toString();
  const recyclerTimezone = getTimezoneFromAddress(
    eventData.recyclerCountryCode ?? 'BR',
  );

  const { code: eventWasteCode, description: eventWasteDescription } =
    getWasteClassification(eventData.pickUpEvent);

  const dropOffTimezone = getTimezoneFromAddress(
    eventData.dropOffEvent?.address.countryCode ?? 'BR',
    eventData.dropOffEvent?.address.countryState,
  );

  // --- Call comparators ---
  const documentNumber = compareStringField(
    extractedData.documentNumber,
    eventData.documentNumber?.toString(),
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        field: 'document number',
      }),
      onMismatch: ({ event, extracted }) =>
        REVIEW_REASONS.DOCUMENT_NUMBER_MISMATCH({
          eventDocumentNumber: event,
          extractedDocumentNumber: extracted,
        }),
      routing: 'fail',
    },
  );

  const issueDate = compareDateField(extractedData.issueDate, eventIssueDate, {
    notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
      field: 'issue date',
    }),
    onMismatch: ({ event, extracted }) =>
      REVIEW_REASONS.ISSUE_DATE_MISMATCH({
        eventIssueDate: event,
        extractedIssueDate: extracted,
      }),
    timezone: recyclerTimezone,
    tolerance: 0,
  });

  const recyclerReasons: EntityComparisonReasons = {
    name: {
      mismatchReason: REVIEW_REASONS.RECYCLER_NAME_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'recycler name',
      }),
    },
    taxId: {
      mismatchReason: REVIEW_REASONS.RECYCLER_TAX_ID_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Recycler" participant',
        field: 'recycler tax ID',
      }),
    },
  };

  const recycler = compareEntity(
    extractedData.recycler,
    eventData.recyclerEvent?.participant.name,
    eventData.recyclerEvent?.participant.taxId,
    recyclerReasons,
  );

  const generatorReasons: EntityComparisonReasons = {
    address: {
      mismatchReason: REVIEW_REASONS.GENERATOR_ADDRESS_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" event',
        field: 'generator address',
      }),
    },
    name: {
      mismatchReason: REVIEW_REASONS.GENERATOR_NAME_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator name',
      }),
    },
    taxId: {
      mismatchReason: REVIEW_REASONS.GENERATOR_TAX_ID_MISMATCH,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: '"Waste Generator" participant',
        field: 'generator tax ID',
      }),
    },
  };

  const generator = compareEntity(
    extractedData.generator,
    eventData.wasteGeneratorEvent?.participant.name,
    eventData.wasteGeneratorEvent?.participant.taxId,
    generatorReasons,
    eventData.wasteGeneratorEvent?.address,
  );

  const processingPeriod = comparePeriod(
    extractedData.processingPeriod,
    eventData.dropOffEvent?.externalCreatedAt,
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Drop-off event date',
        field: 'processing period',
      }),
      onMismatch: REVIEW_REASONS.DROP_OFF_DATE_OUTSIDE_PERIOD,
      timezone: dropOffTimezone,
    },
  );

  const cdfTotalWeight =
    eventData.documentCurrentValue === 0
      ? { debug: null, validation: [] }
      : compareCdfTotalWeight(extractedData, eventData.documentCurrentValue, {
          mismatchReason:
            REVIEW_REASONS.CDF_TOTAL_WEIGHT_LESS_THAN_DOCUMENT_VALUE,
          notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
            field: 'waste entry quantities',
          }),
          ...(extractedData.wasteEntries !== undefined && {
            wasteEntriesConfidence: extractedData.wasteEntries.confidence,
          }),
        });

  const wasteType = compareWasteType(
    extractedData.wasteEntries?.parsed,
    eventWasteCode,
    eventWasteDescription,
    {
      confidence: extractedData.wasteEntries?.confidence ?? null,
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'Pick-up event',
        field: 'waste type entries',
      }),
      onMismatch: REVIEW_REASONS.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH,
      skipValidation:
        layoutValidationConfig.unsupportedValidations?.includes('wasteType') ===
        true,
    },
  );

  const wasteQuantityWeight = compareWasteQuantity(
    extractedData.wasteEntries?.parsed,
    eventWasteCode,
    eventWasteDescription,
    eventData.weighingEvents,
    {
      onMismatch:
        REVIEW_REASONS.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH,
    },
  );

  const mtrNumbers = compareMtrNumbers(
    extractedData.transportManifests,
    eventData.mtrDocumentNumbers,
    {
      notExtractedReason: REVIEW_REASONS.FIELD_NOT_EXTRACTED({
        context: 'MTR document numbers',
        field: 'transport manifest numbers',
      }),
      onMismatch: REVIEW_REASONS.MTR_NUMBER_NOT_IN_CDF,
      skipValidation:
        layoutValidationConfig.unsupportedFields?.includes(
          'transportManifests',
        ) === true,
    },
  );

  // --- Build debug cross-validation object ---
  const crossValidation: CdfCrossValidation = {
    cdfTotalWeight: cdfTotalWeight.debug,
    documentNumber: documentNumber.debug,
    generator: generator.debug,
    issueDate: issueDate.debug,
    mtrNumbers: mtrNumbers.debug,
    processingPeriod: processingPeriod.debug,
    recycler: recycler.debug,
    wasteQuantityWeight: wasteQuantityWeight.debug,
    wasteType: wasteType.debug,
  };

  // --- Collect validation results ---
  const { failReasons, reviewReasons } = collectResults([
    ...documentNumber.validation,
    ...issueDate.validation,
    ...recycler.validation,
    ...generator.validation,
    ...processingPeriod.validation,
    ...cdfTotalWeight.validation,
    ...wasteType.validation,
    ...wasteQuantityWeight.validation,
    ...mtrNumbers.validation,
  ]);

  // Build pass message (only when no fail reasons)
  const passMessage =
    failReasons.length === 0
      ? buildCdfPassMessage(extractedData, eventData)
      : undefined;

  // Build response
  const failMessages = failReasons.map((r) => r.description);

  if (failReasons.length > 0 || reviewReasons.length > 0) {
    return {
      crossValidation,
      extractionMetadata: { layoutConfig: layoutValidationConfig },
      failMessages,
      failReasons,
      ...(passMessage !== undefined && { passMessage }),
      reviewReasons,
      reviewRequired: reviewReasons.length > 0,
    };
  }

  return {
    crossValidation,
    extractionMetadata: { layoutConfig: layoutValidationConfig },
    failMessages,
    ...(passMessage !== undefined && { passMessage }),
    reviewRequired: false,
  };
};
