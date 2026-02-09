import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ExtractedField } from './document-extractor.types';
import type { EntityInfo } from './extraction-result.types';

import {
  createHighConfidenceField,
  createLowConfidenceField,
} from './confidence.helpers';

export const extractStringField = (
  text: string,
  pattern: RegExp,
): undefined | { rawMatch: string; value: string } => {
  const match = pattern.exec(text);

  if (!match?.[1]) {
    return undefined;
  }

  return { rawMatch: match[0], value: match[1].trim() };
};

export const extractAllStringFields = (
  text: string,
  pattern: RegExp,
): Array<{ rawMatch: string; value: string }> => {
  const globalPattern = pattern.global
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);

  const results: Array<{ rawMatch: string; value: string }> = [];

  for (const match of text.matchAll(globalPattern)) {
    if (match[1]) {
      results.push({ rawMatch: match[0], value: match[1].trim() });
    }
  }

  return results;
};

export const parseBrazilianNumber = (value: string): number | undefined => {
  const cleaned = value.replaceAll('.', '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);

  return Number.isNaN(parsed) ? undefined : parsed;
};

export const extractSection = (
  text: string,
  sectionPattern: RegExp,
  allSectionPatterns: RegExp[],
): string | undefined => {
  const lines = text.split('\n');
  const sectionStartIndex = lines.findIndex((line) =>
    sectionPattern.test(line),
  );

  if (sectionStartIndex === -1) {
    return undefined;
  }

  const nextSectionPatterns = allSectionPatterns.filter(
    (p) => p !== sectionPattern,
  );

  let sectionEndIndex = lines.length;

  for (let index = sectionStartIndex + 1; index < lines.length; index++) {
    // istanbul ignore next -- defensive for noUncheckedIndexedAccess; index is within bounds
    if (nextSectionPatterns.some((p) => p.test(lines[index] ?? ''))) {
      sectionEndIndex = index;
      break;
    }
  }

  return lines.slice(sectionStartIndex, sectionEndIndex).join('\n');
};

export const entityFieldOrEmpty = (
  extracted: undefined | { rawMatch: string; value: EntityInfo },
): ExtractedField<EntityInfo> =>
  extracted
    ? createHighConfidenceField(extracted.value, extracted.rawMatch)
    : createLowConfidenceField({
        name: '' as NonEmptyString,
        taxId: '' as NonEmptyString,
      });

export const extractEntityFromSection = (
  text: string,
  sectionPattern: RegExp,
  allSectionPatterns: RegExp[],
  cnpjPattern: RegExp,
): undefined | { rawMatch: string; value: EntityInfo } => {
  const section = extractSection(text, sectionPattern, allSectionPatterns);

  if (!section) {
    return undefined;
  }

  cnpjPattern.lastIndex = 0;
  const cnpjMatch = cnpjPattern.exec(section);

  cnpjPattern.lastIndex = 0;

  if (!cnpjMatch?.[1]) {
    return undefined;
  }

  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  let name: string | undefined;

  for (const line of lines) {
    if (sectionPattern.test(line)) {
      continue;
    }

    if (/CNPJ/i.test(line)) {
      continue;
    }

    if (line.length <= 3 || /^\d+$/.test(line)) {
      continue;
    }

    const cleanedLine = line
      .replace(/Raz[ãa]o\s*Social\s*:?\s*/i, '')
      .replace(/Nome\s*:?\s*/i, '')
      .trim();

    if (cleanedLine.length > 3) {
      name = cleanedLine;
      break;
    }
  }

  if (!name) {
    return undefined;
  }

  return {
    rawMatch: section,
    value: {
      name: name as NonEmptyString,
      taxId: cnpjMatch[1] as NonEmptyString,
    },
  };
};
