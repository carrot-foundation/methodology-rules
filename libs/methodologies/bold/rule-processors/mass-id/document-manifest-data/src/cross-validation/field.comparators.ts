import type {
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import type { MethodologyAddress } from '@carrot-fndn/shared/types';

import {
  dateDifferenceInDays,
  isNameMatch,
  utcIsoToLocalDate,
} from '@carrot-fndn/shared/helpers';

import type {
  EntityComparison,
  FieldComparison,
} from '../document-manifest-data.result-content.types';
import type { FieldValidationResult } from './cross-validation.helpers';

import { buildAddressString, normalizeTaxId } from './cross-validation.helpers';

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
    notExtractedReason?: ReviewReason;
  };
  taxId: {
    mismatchReason: () => ReviewReason;
    notExtractedReason?: ReviewReason;
  };
}

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

  const withComparedFields = {
    ...reason,
    comparedFields: [
      {
        event: eventValue,
        extracted: field.parsed,
        field: 'value',
      },
    ],
  };

  return {
    debug,
    validation:
      options.routing === 'fail'
        ? [{ failReason: withComparedFields }]
        : [{ reviewReason: withComparedFields }],
  };
};

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

  if (daysDiff == null || daysDiff === 0) {
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

const buildEntityNotExtractedReasons = (
  eventNames: readonly string[] | undefined,
  eventTaxId: string | undefined,
  eventAddress: MethodologyAddress | undefined,
  reasons: EntityComparisonReasons,
): FieldValidationResult[] => {
  const validation: FieldValidationResult[] = [];

  if (
    eventNames !== undefined &&
    eventNames.length > 0 &&
    reasons.name.notExtractedReason
  ) {
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

const resolveEntityIsMatch = (taxIdMatch: boolean | null): boolean | null =>
  taxIdMatch;

const toEntityWithAddress = (
  entity: ExtractedEntityInfo,
): ExtractedEntityWithAddressInfo | undefined => {
  const hasAddress =
    'address' in entity && 'city' in entity && 'state' in entity;

  return hasAddress ? (entity as ExtractedEntityWithAddressInfo) : undefined;
};

export const getParticipantNames = (
  participant: undefined | { businessName?: string | undefined; name: string },
): string[] | undefined => {
  if (!participant) {
    return undefined;
  }

  return [participant.name, participant.businessName].filter(
    (n): n is string => n !== undefined,
  );
};

export const compareEntity = (
  entity: ExtractedEntityInfo | undefined,
  eventNames: readonly string[] | undefined,
  eventTaxId: string | undefined,
  reasons: EntityComparisonReasons,
  eventAddress?: MethodologyAddress,
): ComparisonOutput<EntityComparison | null> => {
  if (!entity) {
    return {
      debug: null,
      validation: buildEntityNotExtractedReasons(
        eventNames,
        eventTaxId,
        eventAddress,
        reasons,
      ),
    };
  }

  const nameResult = (() => {
    if (eventNames === undefined || eventNames.length === 0) {
      return;
    }

    let best: undefined | { isMatch: boolean; score: number };

    for (const name of eventNames) {
      const result = isNameMatch(entity.name.parsed, name, undefined, true);

      if (best === undefined || result.score > best.score) {
        best = result;
      }
    }

    return best;
  })();

  const nameSimilarity =
    nameResult === undefined ? null : `${(nameResult.score * 100).toFixed(0)}%`;

  const taxIdMatch =
    eventTaxId === undefined
      ? null
      : normalizeTaxId(entity.taxId.parsed) === normalizeTaxId(eventTaxId);

  const entityWithAddress = toEntityWithAddress(entity);

  const base: EntityComparison = {
    confidence: entity.name.confidence,
    eventNames: eventNames ?? null,
    eventTaxId: eventTaxId ?? null,
    extractedName: entity.name.parsed,
    extractedTaxId: entity.taxId.parsed,
    isMatch: resolveEntityIsMatch(taxIdMatch),
    nameSimilarity,
    taxIdMatch,
  };

  if (entityWithAddress) {
    base.address = buildAddressDebug(entityWithAddress, eventAddress);
  }

  const validation: FieldValidationResult[] = [];

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
