import type {
  ExtractedField,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';

import { utcIsoToLocalDate } from '@carrot-fndn/shared/helpers';

import type {
  MtrNumbersComparison,
  ProcessingPeriodComparison,
} from '../document-manifest-data.result-content.types';
import type { FieldValidationResult } from './cross-validation.helpers';
import type { ComparisonOutput } from './field.comparators';

import { parsePeriodRange } from './cross-validation.helpers';

const ddmmyyyyToIso = (dmy: string): string => {
  const [d, m, y] = dmy.split('/');

  return `${y}-${m}-${d}`;
};

const isBidirectionalSubstring = (a: string, b: string): boolean =>
  a.includes(b) || b.includes(a);

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

  const isMatch =
    !periodRange || !localEventDate
      ? null
      : localEventDate >= ddmmyyyyToIso(periodRange.start) &&
        localEventDate <= ddmmyyyyToIso(periodRange.end);

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
          extractedManifests.parsed.some((m) =>
            isBidirectionalSubstring(m, number_),
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
    const found = extractedManifests.parsed.some((manifest) =>
      isBidirectionalSubstring(manifest, mtrNumber),
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
