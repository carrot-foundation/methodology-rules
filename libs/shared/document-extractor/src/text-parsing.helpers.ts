import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ExtractedField } from './document-extractor.types';
import type {
  EntityInfo,
  EntityWithAddressInfo,
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
} from './extraction-result.types';

import {
  createBlankField,
  createHighConfidenceField,
  createLowConfidenceField,
  MATCH_THRESHOLDS,
} from './confidence.helpers';

export const stripAccents = (text: string): string =>
  text.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '');

export const extractStringField = (
  text: string,
  pattern: RegExp,
): undefined | { rawMatch: string; value: string } => {
  if (pattern.global || pattern.sticky) {
    pattern.lastIndex = 0;
  }

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
    if (nextSectionPatterns.some((p) => p.test(lines[index]!))) {
      sectionEndIndex = index;
      break;
    }
  }

  return lines.slice(sectionStartIndex, sectionEndIndex).join('\n');
};

type BoxedLine = Required<Pick<TextBlock, 'boundingBox' | 'text'>> & TextBlock;
type TextBlock = TextExtractionResult['blocks'][number];

const isBoxedLine = (block: TextBlock): block is BoxedLine =>
  block.blockType === 'LINE' &&
  block.text !== undefined &&
  block.boundingBox !== undefined;

const isReliable = (block: TextBlock): boolean =>
  (block.confidence ?? 0) >= MATCH_THRESHOLDS.textractConfidence;

// A hand-filled value sits right of the label or below it; the next printed line below has no digits.
export const isLabelValueBlank = (
  blocks: TextExtractionResult['blocks'],
  labelPattern: RegExp,
): boolean => {
  const lines = blocks.filter((block) => isBoxedLine(block));
  const label = lines.find((line) => labelPattern.test(line.text));

  if (!label || !isReliable(label)) {
    return false;
  }

  if (label.text.replace(labelPattern, '').replaceAll(/[\s:]/g, '') !== '') {
    return false;
  }

  const { height, left, top, width } = label.boundingBox;
  const bottom = top + height;
  const right = left + width;

  const hasValueOnRow = lines.some((line) => {
    const box = line.boundingBox;
    const centerY = box.top + box.height / 2;

    return (
      line !== label && box.left >= right && centerY >= top && centerY <= bottom
    );
  });

  if (hasValueOnRow) {
    return false;
  }

  const firstBelow = lines
    .filter(
      (line) =>
        line.boundingBox.top >= bottom &&
        line.boundingBox.left < right &&
        line.boundingBox.left + line.boundingBox.width > left,
    )
    .toSorted((first, second) => first.boundingBox.top - second.boundingBox.top)
    .at(0);

  return (
    firstBelow === undefined ||
    (isReliable(firstBelow) && !/\d/.test(firstBelow.text))
  );
};

export const extractFieldWithLabelFallback = (
  text: string,
  valuePattern: RegExp,
  labelPattern: RegExp,
  blocks?: TextExtractionResult['blocks'],
): ExtractedField<NonEmptyString> | undefined => {
  const extracted = extractStringField(text, valuePattern);

  if (extracted) {
    return createHighConfidenceField(extracted.value, extracted.rawMatch);
  }

  if (!labelPattern.test(text)) {
    return undefined;
  }

  return blocks && isLabelValueBlank(blocks, labelPattern)
    ? createBlankField('' as NonEmptyString)
    : createLowConfidenceField('' as NonEmptyString);
};

export const createExtractedEntity = (
  extracted: undefined | { rawMatch: string; value: EntityInfo },
): ExtractedEntityInfo =>
  extracted
    ? {
        name: createHighConfidenceField(
          extracted.value.name,
          extracted.rawMatch,
        ),
        taxId: extracted.value.taxId
          ? createHighConfidenceField(extracted.value.taxId, extracted.rawMatch)
          : createLowConfidenceField('' as NonEmptyString),
      }
    : {
        name: createLowConfidenceField('' as NonEmptyString),
        taxId: createLowConfidenceField('' as NonEmptyString),
      };

export const createExtractedEntityWithAddress = (
  extracted: undefined | { rawMatch: string; value: EntityWithAddressInfo },
): ExtractedEntityWithAddressInfo => {
  const base = createExtractedEntity(extracted);

  if (extracted?.value.address) {
    return {
      ...base,
      address: createHighConfidenceField(
        extracted.value.address,
        extracted.rawMatch,
      ),
      city: createHighConfidenceField(
        extracted.value.city ?? '',
        extracted.rawMatch,
      ),
      state: createHighConfidenceField(
        extracted.value.state ?? '',
        extracted.rawMatch,
      ),
    };
  }

  return {
    ...base,
    address: createLowConfidenceField('' as NonEmptyString),
    city: createLowConfidenceField('' as NonEmptyString),
    state: createLowConfidenceField('' as NonEmptyString),
  };
};

const TAX_ID_LABEL = /CNPJ/i;

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

  const rawCnpj = cnpjMatch?.[1];

  if (!rawCnpj && !TAX_ID_LABEL.test(section)) {
    return undefined;
  }

  const normalizedCnpj = rawCnpj?.replaceAll(' ', '').replaceAll(',', '.');

  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  let name: string | undefined;

  for (const line of lines) {
    if (sectionPattern.test(line)) {
      continue;
    }

    if (TAX_ID_LABEL.test(line)) {
      continue;
    }

    if (line.length <= 3 || /^\d+$/.test(line)) {
      continue;
    }

    const cleanedLine = line
      .replace(/Razao\s*Social\s*:?\s*/i, '')
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
      name,
      ...(normalizedCnpj && { taxId: normalizedCnpj }),
    },
  };
};

const BRAZILIAN_STATE_CODES = new Set([
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
]);

export const isBrazilianStateCode = (value: string): boolean =>
  BRAZILIAN_STATE_CODES.has(value.trim().toUpperCase());
