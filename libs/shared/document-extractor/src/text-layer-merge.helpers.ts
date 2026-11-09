import type {
  BaseExtractedData,
  ExtractedField,
} from './document-extractor.types';

import {
  collectLowConfidenceFields,
  isExtractedEntityGroup,
  isExtractedField,
} from './confidence.helpers';

export type TextLayerMergeResult<T extends BaseExtractedData> =
  | { data: T; outcome: 'filled' }
  | { mismatchedField: string; outcome: 'disagreement' }
  | { outcome: 'unverified' };

type FieldGroup = Record<string, unknown>;

const ANCHOR_FIELD_NAMES = new Set(['documentNumber', 'taxId']);

const isReadWithHighConfidence = (
  field: unknown,
): field is ExtractedField<unknown> =>
  isExtractedField(field) &&
  field.confidence === 'high' &&
  String(field.parsed ?? '').trim().length > 0;

const normalizeAnchor = (value: unknown): string =>
  String(value)
    .replaceAll(/[^\dA-Z]/gi, '')
    .toUpperCase();

const collectAnchors = (
  group: FieldGroup,
  prefix = '',
): Map<string, ExtractedField<unknown>> => {
  const anchors = new Map<string, ExtractedField<unknown>>();

  for (const [key, value] of Object.entries(group)) {
    if (isExtractedField(value) && ANCHOR_FIELD_NAMES.has(key)) {
      anchors.set(`${prefix}${key}`, value);
    } else if (isExtractedEntityGroup(value)) {
      for (const [path, field] of collectAnchors(value, `${prefix}${key}.`)) {
        anchors.set(path, field);
      }
    }
  }

  return anchors;
};

const fillGroup = (primary: FieldGroup, textLayer: FieldGroup): FieldGroup => {
  const merged = { ...primary };

  for (const [key, candidate] of Object.entries(textLayer)) {
    // eslint-disable-next-line security/detect-object-injection
    const current = primary[key];

    if (isExtractedField(candidate)) {
      if (
        isReadWithHighConfidence(candidate) &&
        !isReadWithHighConfidence(current)
      ) {
        // eslint-disable-next-line security/detect-object-injection
        merged[key] = candidate;
      }
    } else if (isExtractedEntityGroup(candidate)) {
      // eslint-disable-next-line security/detect-object-injection
      merged[key] = isExtractedEntityGroup(current)
        ? fillGroup(current, candidate)
        : (current ?? candidate);
    }
  }

  return merged;
};

export const mergeTextLayerFields = <T extends BaseExtractedData>(
  primary: T,
  textLayer: T,
): TextLayerMergeResult<T> => {
  const textLayerAnchors = collectAnchors(textLayer as unknown as FieldGroup);
  let agreedAnchors = 0;

  for (const [path, field] of collectAnchors(
    primary as unknown as FieldGroup,
  )) {
    const other = textLayerAnchors.get(path);

    if (!isReadWithHighConfidence(field) || !isReadWithHighConfidence(other)) {
      continue;
    }

    if (normalizeAnchor(field.parsed) !== normalizeAnchor(other.parsed)) {
      return { mismatchedField: path, outcome: 'disagreement' };
    }

    agreedAnchors += 1;
  }

  if (agreedAnchors === 0) {
    return { outcome: 'unverified' };
  }

  const merged = fillGroup(
    primary as unknown as FieldGroup,
    textLayer as unknown as FieldGroup,
  );
  const stillLow = new Set(
    collectLowConfidenceFields(merged, Object.keys(merged)),
  );

  return {
    data: {
      ...merged,
      lowConfidenceFields: [
        ...primary.lowConfidenceFields.filter((field) => stillLow.has(field)),
        ...[...stillLow].filter(
          (field) => !primary.lowConfidenceFields.includes(field),
        ),
      ],
    } as unknown as T,
    outcome: 'filled',
  };
};
