import type {
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
  ExtractionConfidence,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import type { CdfExtractedData } from '@carrot-fndn/shared/document-extractor-recycling-manifest';
import type { WasteTypeEntryData } from '@carrot-fndn/shared/document-extractor-transport-manifest';
import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import {
  dateDifferenceInDays,
  isNameMatch,
  utcIsoToLocalDate,
} from '@carrot-fndn/shared/helpers';

import type { FieldValidationResult } from './cross-validation.helpers';
import type {
  CdfTotalWeightComparison,
  EntityComparison,
  FieldComparison,
  MtrNumbersComparison,
  ProcessingPeriodComparison,
  WasteQuantityComparison,
  WasteTypeComparison,
  WasteTypeEntry,
} from './document-manifest-data.result-content.types';

import {
  buildAddressString,
  computeCdfTotalKg,
  matchWasteTypeEntry,
  normalizeQuantityToKg,
  normalizeTaxId,
  parsePeriodRange,
} from './cross-validation.helpers';

export interface ComparisonOutput<TDebug> {
  debug: TDebug;
  validation: FieldValidationResult[];
}

export interface EntityComparisonReasons {
  address?: {
    mismatchReason: (parameters: { score: number }) => ReviewReason;
    notExtractedReason?: ReviewReason;
  };
  name: {
    mismatchReason: (parameters: { score: number }) => ReviewReason;
    notExtractedReason?: ReviewReason;
  };
  taxId: {
    mismatchReason: () => ReviewReason;
    notExtractedReason?: ReviewReason;
  };
}

// ---------------------------------------------------------------------------
// 1. compareStringField
// ---------------------------------------------------------------------------

export const compareStringField = (
  field: ExtractedField<string> | undefined,
  eventValue: string | undefined,
  options: {
    compareFn?: (extracted: string, event: string) => boolean;
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      event: string;
      extracted: string;
    }) => ReviewReason;
    routing: 'fail' | 'review';
  },
): ComparisonOutput<FieldComparison> => {
  const compareFunction = options.compareFn ?? ((a, b) => a === b);

  const debug: FieldComparison = {
    confidence: field?.confidence ?? null,
    event: eventValue ?? null,
    extracted: field?.parsed ?? null,
    isMatch:
      field !== undefined && eventValue !== undefined
        ? compareFunction(field.parsed, eventValue)
        : null,
  };

  if (!field) {
    return {
      debug,
      validation:
        options.notExtractedReason && eventValue !== undefined
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (field.confidence !== 'high' || eventValue === undefined) {
    return { debug, validation: [] };
  }

  if (debug.isMatch === true) {
    return { debug, validation: [] };
  }

  const reason = options.onMismatch({
    event: eventValue,
    extracted: field.parsed,
  });

  return {
    debug,
    validation:
      options.routing === 'fail'
        ? [{ failReason: reason }]
        : [
            {
              reviewReason: {
                ...reason,
                comparedFields: [
                  {
                    event: eventValue,
                    extracted: field.parsed,
                    field: 'value',
                  },
                ],
              },
            },
          ],
  };
};

// ---------------------------------------------------------------------------
// 2. compareDateField
// ---------------------------------------------------------------------------

export const DATE_TOLERANCE_DAYS = 3;

export const compareDateField = (
  field: ExtractedField<string> | undefined,
  eventDate: string | undefined,
  options: {
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      daysDiff: number;
      event: string;
      extracted: string;
    }) => ReviewReason;
    timezone?: string;
    tolerance?: number;
  },
): ComparisonOutput<FieldComparison> => {
  const timezone = options.timezone ?? 'UTC';
  const tolerance = options.tolerance ?? DATE_TOLERANCE_DAYS;

  const localEventDate =
    eventDate === undefined
      ? undefined
      : utcIsoToLocalDate(eventDate, timezone);

  const daysDiff =
    field?.parsed !== undefined && localEventDate !== undefined
      ? dateDifferenceInDays(field.parsed, localEventDate)
      : null;

  const debug: FieldComparison = {
    confidence: field?.confidence ?? null,
    daysDiff: daysDiff ?? null,
    event: eventDate ?? null,
    extracted: field?.parsed ?? null,
    isMatch: daysDiff == null ? null : daysDiff === 0,
  };

  if (!field) {
    return {
      debug,
      validation:
        options.notExtractedReason && eventDate !== undefined
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (field.confidence !== 'high' || localEventDate === undefined) {
    return { debug, validation: [] };
  }

  if (daysDiff === undefined || daysDiff === null || daysDiff === 0) {
    return { debug, validation: [] };
  }

  const reason = options.onMismatch({
    daysDiff,
    event: eventDate!,
    extracted: field.parsed,
  });

  const reasonWithComparedFields = {
    ...reason,
    comparedFields: [
      {
        event: eventDate!,
        extracted: field.parsed,
        field: 'date',
        similarity: `${daysDiff} days`,
      },
    ],
  };

  if (daysDiff > tolerance) {
    return { debug, validation: [{ failReason: reasonWithComparedFields }] };
  }

  return { debug, validation: [{ reviewReason: reasonWithComparedFields }] };
};

// ---------------------------------------------------------------------------
// 3. compareEntity
// ---------------------------------------------------------------------------

const buildEntityNotExtractedReasons = (
  eventName: string | undefined,
  eventTaxId: string | undefined,
  eventAddress: MethodologyAddress | undefined,
  reasons: EntityComparisonReasons,
): FieldValidationResult[] => {
  const validation: FieldValidationResult[] = [];

  if (eventName !== undefined && reasons.name.notExtractedReason) {
    validation.push({ reviewReason: reasons.name.notExtractedReason });
  }

  if (eventTaxId !== undefined && reasons.taxId.notExtractedReason) {
    validation.push({ reviewReason: reasons.taxId.notExtractedReason });
  }

  if (eventAddress !== undefined && reasons.address?.notExtractedReason) {
    validation.push({ reviewReason: reasons.address.notExtractedReason });
  }

  return validation;
};

const buildExtractedAddress = (
  entityWithAddress: ExtractedEntityWithAddressInfo,
): string =>
  [
    entityWithAddress.address.parsed,
    entityWithAddress.city.parsed,
    entityWithAddress.state.parsed,
  ]
    .filter(Boolean)
    .join(', ');

const buildAddressDebug = (
  entityWithAddress: ExtractedEntityWithAddressInfo,
  eventAddress: MethodologyAddress | undefined,
): NonNullable<EntityComparison['address']> => {
  const extractedAddress = buildExtractedAddress(entityWithAddress);

  if (!eventAddress) {
    return {
      confidence: entityWithAddress.address.confidence,
      extracted: extractedAddress,
    };
  }

  const eventAddressString = buildAddressString(eventAddress);
  const { score } = isNameMatch(extractedAddress, eventAddressString);

  return {
    addressSimilarity: `${(score * 100).toFixed(0)}%`,
    confidence: entityWithAddress.address.confidence,
    event: eventAddressString,
    extracted: extractedAddress,
  };
};

const validateEntityAddress = (
  entityWithAddress: ExtractedEntityWithAddressInfo,
  eventAddress: MethodologyAddress,
  addressReasons: NonNullable<EntityComparisonReasons['address']>,
): FieldValidationResult | undefined => {
  if (entityWithAddress.address.confidence !== 'high') {
    return undefined;
  }

  const eventAddressString = buildAddressString(eventAddress);
  const extractedAddress = buildExtractedAddress(entityWithAddress);
  const { isMatch, score } = isNameMatch(
    extractedAddress,
    eventAddressString,
    undefined,
    true,
  );

  if (isMatch) {
    return undefined;
  }

  return {
    reviewReason: {
      ...addressReasons.mismatchReason({ score }),
      comparedFields: [
        {
          event: eventAddressString,
          extracted: extractedAddress,
          field: 'address',
          similarity: `${(score * 100).toFixed(0)}%`,
        },
      ],
    },
  };
};

const resolveEntityIsMatch = (
  taxIdMatch: boolean | null,
  nameResult: undefined | { isMatch: boolean },
): boolean | null => {
  if (taxIdMatch === true) {
    return true;
  }

  if (taxIdMatch === false) {
    return false;
  }

  return nameResult === undefined ? null : nameResult.isMatch;
};

const toEntityWithAddress = (
  entity: ExtractedEntityInfo,
): ExtractedEntityWithAddressInfo | undefined => {
  const hasAddress =
    'address' in entity && 'city' in entity && 'state' in entity;

  return hasAddress ? (entity as ExtractedEntityWithAddressInfo) : undefined;
};

export const compareEntity = (
  entity: ExtractedEntityInfo | undefined,
  eventName: string | undefined,
  eventTaxId: string | undefined,
  reasons: EntityComparisonReasons,
  eventAddress?: MethodologyAddress,
): ComparisonOutput<EntityComparison | null> => {
  if (!entity) {
    return {
      debug: null,
      validation: buildEntityNotExtractedReasons(
        eventName,
        eventTaxId,
        eventAddress,
        reasons,
      ),
    };
  }

  const nameResult =
    eventName === undefined
      ? undefined
      : isNameMatch(entity.name.parsed, eventName, undefined, true);

  const nameSimilarity =
    nameResult === undefined ? null : `${(nameResult.score * 100).toFixed(0)}%`;

  const taxIdMatch =
    eventTaxId === undefined
      ? null
      : normalizeTaxId(entity.taxId.parsed) === normalizeTaxId(eventTaxId);

  const entityWithAddress = toEntityWithAddress(entity);

  const base: EntityComparison = {
    confidence: entity.name.confidence,
    eventName: eventName ?? null,
    eventTaxId: eventTaxId ?? null,
    extractedName: entity.name.parsed,
    extractedTaxId: entity.taxId.parsed,
    isMatch: resolveEntityIsMatch(taxIdMatch, nameResult),
    nameSimilarity,
    taxIdMatch,
  };

  if (entityWithAddress) {
    base.address = buildAddressDebug(entityWithAddress, eventAddress);
  }

  const validation: FieldValidationResult[] = [];

  if (
    entity.name.confidence === 'high' &&
    nameResult !== undefined &&
    !nameResult.isMatch
  ) {
    validation.push({
      reviewReason: {
        ...reasons.name.mismatchReason({ score: nameResult.score }),
        comparedFields: [
          {
            event: eventName!,
            extracted: entity.name.parsed,
            field: 'name',
            similarity: nameSimilarity!,
          },
        ],
      },
    });
  }

  if (entity.taxId.confidence === 'high' && taxIdMatch === false) {
    validation.push({
      failReason: {
        ...reasons.taxId.mismatchReason(),
        comparedFields: [
          {
            event: eventTaxId!,
            extracted: entity.taxId.parsed,
            field: 'taxId',
          },
        ],
      },
    });
  }

  if (entityWithAddress && eventAddress && reasons.address) {
    const addressResult = validateEntityAddress(
      entityWithAddress,
      eventAddress,
      reasons.address,
    );

    if (addressResult) {
      validation.push(addressResult);
    }
  }

  return { debug: base, validation };
};

// ---------------------------------------------------------------------------
// 4. compareWasteType
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 5. compareWasteQuantity
// ---------------------------------------------------------------------------

export const WEIGHT_DISCREPANCY_THRESHOLD = 0.1;

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

  // Validation: only produce reviewReason if discrepancy exceeds threshold
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

// ---------------------------------------------------------------------------
// 6. compareCdfTotalWeight
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 7. comparePeriod
// ---------------------------------------------------------------------------

export const comparePeriod = (
  periodField: ExtractedField<string> | undefined,
  eventDate: string | undefined,
  options: {
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: {
      dropOffDate: string;
      periodEnd: string;
      periodStart: string;
    }) => ReviewReason;
    timezone?: string;
  },
): ComparisonOutput<ProcessingPeriodComparison> => {
  const timezone = options.timezone ?? 'UTC';
  const periodRange = periodField
    ? parsePeriodRange(periodField.parsed)
    : undefined;

  const localEventDate =
    eventDate === undefined
      ? undefined
      : utcIsoToLocalDate(eventDate, timezone);

  const isMatch = (() => {
    if (!periodRange || !localEventDate) {
      return null;
    }

    const ddmmyyyyToIso = (dmy: string): string => {
      const [d, m, y] = dmy.split('/');

      return `${y}-${m}-${d}`;
    };

    return (
      localEventDate >= ddmmyyyyToIso(periodRange.start) &&
      localEventDate <= ddmmyyyyToIso(periodRange.end)
    );
  })();

  const debug: ProcessingPeriodComparison = {
    confidence: periodField?.confidence ?? null,
    event: eventDate ?? null,
    extracted: periodField?.parsed ?? null,
    isMatch,
    ...(periodRange && { end: periodRange.end, start: periodRange.start }),
  };

  if (!periodField) {
    return {
      debug,
      validation:
        options.notExtractedReason && eventDate !== undefined
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (!periodRange) {
    return {
      debug,
      validation: options.notExtractedReason
        ? [{ reviewReason: options.notExtractedReason }]
        : [],
    };
  }

  if (!eventDate || isMatch === true) {
    return { debug, validation: [] };
  }

  const reason = {
    ...options.onMismatch({
      dropOffDate: eventDate,
      periodEnd: periodRange.end,
      periodStart: periodRange.start,
    }),
    comparedFields: [
      {
        event: localEventDate!,
        extracted: `${periodRange.start} - ${periodRange.end}`,
        field: 'dateWithinPeriod',
      },
    ],
  };

  return {
    debug,
    validation:
      periodField.confidence === 'high'
        ? [{ failReason: reason }]
        : [{ reviewReason: reason }],
  };
};

// ---------------------------------------------------------------------------
// 8. compareMtrNumbers
// ---------------------------------------------------------------------------

export const compareMtrNumbers = (
  extractedManifests: ExtractedField<string[]> | undefined,
  eventMtrNumbers: string[],
  options: {
    notExtractedReason?: ReviewReason;
    onMismatch: (parameters: { mtrNumber: string }) => ReviewReason;
    skipValidation?: boolean;
  },
): ComparisonOutput<MtrNumbersComparison> => {
  const extracted = extractedManifests?.parsed ?? null;

  const isMatch =
    extractedManifests === undefined
      ? null
      : eventMtrNumbers.every((number_) =>
          extractedManifests.parsed.some(
            (m) => m.includes(number_) || number_.includes(m),
          ),
        );

  const debug: MtrNumbersComparison = {
    event: eventMtrNumbers,
    extracted,
    isMatch,
  };

  if (options.skipValidation === true) {
    return { debug, validation: [] };
  }

  if (!extractedManifests) {
    return {
      debug,
      validation:
        options.notExtractedReason && eventMtrNumbers.length > 0
          ? [{ reviewReason: options.notExtractedReason }]
          : [],
    };
  }

  if (eventMtrNumbers.length === 0) {
    return { debug, validation: [] };
  }

  const validation: FieldValidationResult[] = [];

  for (const mtrNumber of eventMtrNumbers) {
    const found = extractedManifests.parsed.some(
      (manifest) =>
        manifest.includes(mtrNumber) || mtrNumber.includes(manifest),
    );

    if (!found) {
      validation.push({
        reviewReason: {
          ...options.onMismatch({ mtrNumber }),
          comparedFields: [
            {
              event: mtrNumber,
              extracted: extractedManifests.parsed.join(', '),
              field: 'mtrNumber',
            },
          ],
        },
      });
    }
  }

  return { debug, validation };
};
