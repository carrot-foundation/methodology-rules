import type {
  ExtractionConfidence,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  CdfTotalWeightComparison,
  WasteQuantityComparison,
  WasteTypeComparison,
  WasteTypeEntry,
} from '../document-manifest-data.result-content.types';
import type { FieldValidationResult } from './cross-validation.helpers';
import type { ComparisonOutput } from './field.comparators';

import {
  computeCdfTotalKg,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
} from './cross-validation.helpers';

export const WEIGHT_DISCREPANCY_THRESHOLD = 0.1;

const buildWasteTypeDebugEntry = (
  entry: WasteTypeEntryData,
  eventWasteCode: string | undefined,
  eventWasteDescription: string | undefined,
): WasteTypeEntry => {
  const match = matchWasteTypeEntry(
    entry,
    eventWasteCode,
    eventWasteDescription,
  );

  return {
    descriptionSimilarity:
      match.descriptionSimilarity === null
        ? null
        : `${(match.descriptionSimilarity * 100).toFixed(0)}%`,
    extracted: entry.code
      ? `${entry.code} - ${entry.description}`
      : entry.description,
    isCodeMatch: match.isCodeMatch,
    isMatch: match.isMatch,
  };
};

export const compareWasteType = (
  entries: undefined | WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  options: {
    confidence?: ExtractionConfidence | null;
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      eventClassification: string;
      extractedEntries: string;
    }) => ReviewReason;
    skipValidation?: boolean;
  },
): ComparisonOutput<WasteTypeComparison> => {
  const debugEntries =
    entries?.map((entry) =>
      buildWasteTypeDebugEntry(entry, eventCode, eventDescription),
    ) ?? null;

  const debug: WasteTypeComparison = {
    ...(options.confidence !== undefined && { confidence: options.confidence }),
    entries: debugEntries,
    eventCode: eventCode ?? null,
    eventDescription: eventDescription ?? null,
    isMatch: debugEntries?.some((e) => e.isMatch === true) ?? null,
  };

  if (options.skipValidation === true) {
    return { debug, validation: [] };
  }

  if (!entries || entries.length === 0) {
    return {
      debug,
      validation:
        options.notExtractedReason &&
        (eventCode !== undefined || eventDescription !== undefined)
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (!eventCode && !eventDescription) {
    return { debug, validation: [] };
  }

  const meaningfulEntries = entries.filter((e) => e.code || e.description);

  if (meaningfulEntries.length === 0) {
    return {
      debug,
      validation: options.notExtractedReason
        ? [{ reviewReason: options.notExtractedReason }]
        : [],
    };
  }

  const hasMatch = meaningfulEntries.some(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (hasMatch) {
    return { debug, validation: [] };
  }

  const extractedSummary = meaningfulEntries
    .map((e) => (e.code ? `${e.code} - ${e.description}` : e.description))
    .join(', ');

  const eventSummary = [eventCode, eventDescription]
    .filter(Boolean)
    .join(' - ');

  return {
    debug,
    validation: [
      {
        reviewReason: {
          ...options.onMismatch({
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
      },
    ],
  };
};

export const compareWasteQuantity = (
  entries: undefined | WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  weighingEvents: Pick<DocumentEvent, 'value'>[],
  options: {
    onMismatch: (parameters: {
      discrepancyPercentage: string;
      extractedQuantity: string;
      unit: string;
      weighingWeight: string;
    }) => ReviewReason;
  },
): ComparisonOutput<null | WasteQuantityComparison> => {
  if (!entries || entries.length === 0) {
    return { debug: null, validation: [] };
  }

  const matchedEntry = entries.find(
    (entry) => matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch,
  );

  if (matchedEntry?.quantity === undefined) {
    return { debug: null, validation: [] };
  }

  const normalizedKg = normalizeQuantityToKg(
    matchedEntry.quantity,
    matchedEntry.unit,
  );

  const weighingEvent = weighingEvents.find(
    (event) => event.value !== undefined && event.value > 0,
  );
  const weighingValue = weighingEvent?.value;

  const discrepancy =
    normalizedKg !== undefined &&
    weighingValue !== undefined &&
    weighingValue > 0
      ? Math.abs(normalizedKg - weighingValue) / weighingValue
      : null;

  const debug: WasteQuantityComparison = {
    confidence: null,
    discrepancyPercentage:
      discrepancy === null ? null : `${(discrepancy * 100).toFixed(1)}%`,
    event: weighingValue ?? null,
    extracted: normalizedKg ?? null,
    extractedQuantity: matchedEntry.quantity,
    extractedUnit: matchedEntry.unit ?? null,
    isMatch:
      normalizedKg !== undefined &&
      weighingValue !== undefined &&
      discrepancy !== null &&
      discrepancy <= WEIGHT_DISCREPANCY_THRESHOLD,
  };

  const validation: FieldValidationResult[] = [];

  if (
    discrepancy !== null &&
    discrepancy > WEIGHT_DISCREPANCY_THRESHOLD &&
    matchedEntry.quantity > 0 &&
    weighingValue !== undefined
  ) {
    validation.push({
      reviewReason: {
        ...options.onMismatch({
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
    });
  }

  return { debug, validation };
};

export const compareCdfTotalWeight = (
  extractedData: CdfExtractedData,
  documentCurrentValue: number,
  options: {
    mismatchReason: (parameters: {
      documentCurrentValue: number;
      extractedTotalKg: number;
    }) => ReviewReason;
    notExtractedReason?: ReviewReason;
    wasteEntriesConfidence?: ExtractionConfidence;
  },
): ComparisonOutput<CdfTotalWeightComparison | null> => {
  if (!extractedData.wasteEntries) {
    return { debug: null, validation: [] };
  }

  const { hasValidQuantity, totalKg } = computeCdfTotalKg(
    extractedData.wasteEntries.parsed,
  );

  const debug: CdfTotalWeightComparison = {
    confidence: extractedData.wasteEntries.confidence,
    event: documentCurrentValue,
    extracted: hasValidQuantity ? totalKg : null,
    isMatch: hasValidQuantity ? documentCurrentValue <= totalKg : null,
  };

  const validation: FieldValidationResult[] = [];

  if (!hasValidQuantity && options.notExtractedReason) {
    const confidence =
      options.wasteEntriesConfidence ?? extractedData.wasteEntries.confidence;

    validation.push(
      confidence === 'high'
        ? { failReason: options.notExtractedReason }
        : { reviewReason: options.notExtractedReason },
    );
  } else if (
    hasValidQuantity &&
    documentCurrentValue > 0 &&
    documentCurrentValue > totalKg
  ) {
    const confidence =
      options.wasteEntriesConfidence ?? extractedData.wasteEntries.confidence;
    const reason = options.mismatchReason({
      documentCurrentValue,
      extractedTotalKg: totalKg,
    });

    validation.push(
      confidence === 'high' ? { failReason: reason } : { reviewReason: reason },
    );
  }

  return { debug, validation };
};
