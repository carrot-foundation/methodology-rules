import type {
  ExtractionConfidence,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  WasteQuantityComparison,
  WasteTypeComparison,
  WasteTypeEntry,
} from '../document-manifest-data.result-content.types';
import type { FieldValidationResult } from './cross-validation.helpers';
import type { ComparisonOutput } from './field.comparators';

import {
  computeCdfTotalKg,
  formatScoreAsPercent,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
} from './cross-validation.helpers';

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
        : formatScoreAsPercent(match.descriptionSimilarity),
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
  const trimmedEventCode = eventCode?.trim() || undefined;
  const trimmedEventDescription = eventDescription?.trim() || undefined;

  const debugEntries =
    entries?.map((entry) =>
      buildWasteTypeDebugEntry(
        entry,
        trimmedEventCode,
        trimmedEventDescription,
      ),
    ) ?? null;

  const debug: WasteTypeComparison = {
    ...(options.confidence !== undefined && { confidence: options.confidence }),
    entries: debugEntries,
    eventCode: trimmedEventCode ?? null,
    eventDescription: trimmedEventDescription ?? null,
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
        (trimmedEventCode !== undefined ||
          trimmedEventDescription !== undefined)
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (!trimmedEventCode && !trimmedEventDescription) {
    return { debug, validation: [] };
  }

  const meaningfulEntries = entries.filter(
    (e) => e.code?.trim() || e.description.trim(),
  );

  if (meaningfulEntries.length === 0) {
    return {
      debug,
      validation: options.notExtractedReason
        ? [{ reviewReason: options.notExtractedReason }]
        : [],
    };
  }

  if (debug.isMatch === true) {
    return { debug, validation: [] };
  }

  const extractedSummary = meaningfulEntries
    .map((e) => {
      const code = e.code?.trim();
      const description = e.description.trim();

      return code ? `${code} - ${description}` : description;
    })
    .join(', ');

  const eventSummary = [trimmedEventCode, trimmedEventDescription]
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

const getWeighingValueKg = (
  weighingEvents: Pick<DocumentEvent, 'value'>[],
): number | undefined =>
  weighingEvents.find((e) => e.value !== undefined && e.value > 0)?.value;

const WEIGHT_TOLERANCE_KG = 0.01;

const buildWeightValidation = (
  extractedKg: number | undefined,
  weighingValue: number | undefined,
  options: {
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      extractedQuantityKg: string;
      weighingWeight: string;
    }) => ReviewReason;
    skipValidation?: boolean;
  },
): FieldValidationResult[] => {
  if (options.skipValidation === true) {
    return [];
  }

  if (extractedKg === undefined) {
    return options.notExtractedReason && weighingValue !== undefined
      ? [{ reviewReason: options.notExtractedReason }]
      : [];
  }

  if (
    weighingValue === undefined ||
    weighingValue <= extractedKg + WEIGHT_TOLERANCE_KG
  ) {
    return [];
  }

  return [
    {
      reviewReason: {
        ...options.onMismatch({
          extractedQuantityKg: extractedKg.toString(),
          weighingWeight: weighingValue.toString(),
        }),
        comparedFields: [
          {
            event: `${weighingValue} kg`,
            extracted: `${extractedKg} kg`,
            field: 'wasteQuantity',
          },
        ],
      },
    },
  ];
};

export const compareWasteQuantity = (
  entries: undefined | WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  weighingEvents: Pick<DocumentEvent, 'value'>[],
  options: {
    confidence?: ExtractionConfidence | null;
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      extractedQuantityKg: string;
      weighingWeight: string;
    }) => ReviewReason;
    skipValidation?: boolean;
  },
): ComparisonOutput<null | WasteQuantityComparison> => {
  const weighingValue = getWeighingValueKg(weighingEvents);

  if (!entries || entries.length === 0) {
    return {
      debug: null,
      validation: buildWeightValidation(undefined, weighingValue, options),
    };
  }

  // Strategy 1: match by waste type
  const trimmedEventCode = eventCode?.trim() || undefined;
  const trimmedEventDescription = eventDescription?.trim() || undefined;

  const matchedEntry = entries.find(
    (entry) =>
      matchWasteTypeEntry(entry, trimmedEventCode, trimmedEventDescription)
        .isMatch,
  );

  if (matchedEntry?.quantity !== undefined) {
    const normalizedKg = normalizeQuantityToKg(
      matchedEntry.quantity,
      matchedEntry.unit,
    );
    const isMatch =
      normalizedKg !== undefined && weighingValue !== undefined
        ? weighingValue <= normalizedKg + WEIGHT_TOLERANCE_KG
        : null;

    return {
      debug: {
        confidence: options.confidence ?? null,
        event: weighingValue ?? null,
        extracted: normalizedKg ?? null,
        extractedQuantity: matchedEntry.quantity,
        extractedUnit: matchedEntry.unit ?? null,
        isMatch,
        source: 'matched-entry',
      },
      validation: buildWeightValidation(normalizedKg, weighingValue, options),
    };
  }

  // Strategy 2: fallback to total weight
  const { hasValidQuantity, totalKg } = computeCdfTotalKg(entries);
  const extractedKg = hasValidQuantity ? totalKg : undefined;
  const isMatch =
    extractedKg !== undefined && weighingValue !== undefined
      ? weighingValue <= extractedKg + WEIGHT_TOLERANCE_KG
      : null;

  return {
    debug: {
      confidence: options.confidence ?? null,
      event: weighingValue ?? null,
      extracted: extractedKg ?? null,
      extractedQuantity: null,
      extractedUnit: null,
      isMatch,
      source: 'total-weight',
    },
    validation: buildWeightValidation(extractedKg, weighingValue, options),
  };
};
