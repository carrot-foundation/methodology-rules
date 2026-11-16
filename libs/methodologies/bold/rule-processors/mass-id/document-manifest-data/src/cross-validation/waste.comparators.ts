import type {
  ExtractionConfidence,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { BoldDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

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
  weighingEvents: Pick<BoldDocumentEvent, 'value'>[],
): number | undefined =>
  weighingEvents.find((e) => e.value !== undefined && e.value > 0)?.value;

const WEIGHT_TOLERANCE_KG = 0.01;
const WEIGHT_LOWER_BOUND_FRACTION = 0.2;

type WeighingPosition = 'above' | 'far-below' | 'within';

const getWeighingPosition = (
  extractedKg: number,
  weighingValue: number,
  checkLowerBound: boolean,
): WeighingPosition => {
  if (weighingValue > extractedKg + WEIGHT_TOLERANCE_KG) {
    return 'above';
  }

  return checkLowerBound &&
    weighingValue + WEIGHT_TOLERANCE_KG <
      extractedKg * (1 - WEIGHT_LOWER_BOUND_FRACTION)
    ? 'far-below'
    : 'within';
};

type WeightReasonOptions = {
  notExtractedReason?: ReviewReason;
  // Opt-in lower bound: set only when the extracted quantity belongs to this weighing (MTR). A CDF quantity is a batch total over many masses.
  onFarBelow?: (parameters: {
    extractedQuantityKg: string;
    weighingWeight: string;
  }) => ReviewReason;
  onMismatch: (parameters: {
    extractedQuantityKg: string;
    weighingWeight: string;
  }) => ReviewReason;
  skipValidation?: boolean;
};

const buildWeightValidation = (
  extractedKg: number | undefined,
  weighingValue: number | undefined,
  options: WeightReasonOptions,
): FieldValidationResult[] => {
  if (options.skipValidation === true) {
    return [];
  }

  if (extractedKg === undefined) {
    return options.notExtractedReason && weighingValue !== undefined
      ? [{ reviewReason: options.notExtractedReason }]
      : [];
  }

  if (weighingValue === undefined) {
    return [];
  }

  const position = getWeighingPosition(
    extractedKg,
    weighingValue,
    options.onFarBelow !== undefined,
  );

  if (position === 'within') {
    return [];
  }

  // 'far-below' is only reported when onFarBelow is set
  const onReason =
    position === 'above' ? options.onMismatch : options.onFarBelow!;

  return [
    {
      reviewReason: {
        ...onReason({
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

// A manifest can repeat a waste type across rows (e.g. one at 0 kg); one row must cover the weighing,
// so prefer a row whose bounds hold it and otherwise fall back to the largest.
const findMatchedEntry = (
  entries: WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  weighingValue: number | undefined,
  checkLowerBound: boolean,
): undefined | WasteTypeEntryData => {
  let largestEntry: undefined | WasteTypeEntryData;
  let largestKg = Number.NEGATIVE_INFINITY;
  let coveringEntry: undefined | WasteTypeEntryData;

  for (const entry of entries) {
    if (
      entry.quantity === undefined ||
      !matchWasteTypeEntry(entry, eventCode, eventDescription).isMatch
    ) {
      continue;
    }

    const quantityKg =
      normalizeQuantityToKg(entry.quantity, entry.unit) ??
      Number.NEGATIVE_INFINITY;

    if (largestEntry === undefined || quantityKg > largestKg) {
      largestEntry = entry;
      largestKg = quantityKg;
    }

    if (
      checkLowerBound &&
      coveringEntry === undefined &&
      weighingValue !== undefined &&
      Number.isFinite(quantityKg) &&
      getWeighingPosition(quantityKg, weighingValue, true) === 'within'
    ) {
      coveringEntry = entry;
    }
  }

  return coveringEntry ?? largestEntry;
};

export const compareWasteQuantity = (
  entries: undefined | WasteTypeEntryData[],
  eventCode: string | undefined,
  eventDescription: string | undefined,
  weighingEvents: Pick<BoldDocumentEvent, 'value'>[],
  options: WeightReasonOptions & { confidence?: ExtractionConfidence | null },
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

  const matchedEntry = findMatchedEntry(
    entries,
    trimmedEventCode,
    trimmedEventDescription,
    weighingValue,
    options.onFarBelow !== undefined,
  );

  if (matchedEntry?.quantity !== undefined) {
    const normalizedKg = normalizeQuantityToKg(
      matchedEntry.quantity,
      matchedEntry.unit,
    );
    const isMatch =
      normalizedKg !== undefined && weighingValue !== undefined
        ? getWeighingPosition(
            normalizedKg,
            weighingValue,
            options.onFarBelow !== undefined,
          ) === 'within'
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
      ? getWeighingPosition(
          extractedKg,
          weighingValue,
          options.onFarBelow !== undefined,
        ) === 'within'
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
