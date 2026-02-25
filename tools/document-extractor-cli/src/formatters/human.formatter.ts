import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

import { blue, bold, green, red, yellow } from '@carrot-fndn/shared/cli';

interface HumanFormatOptions {
  debug?: boolean;
}

const isExtractedField = (
  value: unknown,
): value is { confidence: string; parsed: unknown; rawMatch?: string } =>
  typeof value === 'object' &&
  value !== null &&
  'parsed' in value &&
  'confidence' in value;

const isExtractedEntityGroup = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !('parsed' in value) &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).some((v) =>
    isExtractedField(v),
  );

const isExtractedEntityGroupArray = (
  value: unknown,
): value is Array<Record<string, unknown>> =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      !('parsed' in item) &&
      Object.values(item as Record<string, unknown>).some((v) =>
        isExtractedField(v),
      ),
  );

const formatConfidence = (confidence: string): string => {
  const icon = confidence === 'high' ? '✓' : '⚠';
  const text = `${icon} ${confidence}`;

  return confidence === 'high' ? green(text) : yellow(text);
};

const formatBrazilianQuantity = (quantity: number): string =>
  quantity.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const isReceiptEntry = (
  item: unknown,
): item is { quantity: number; receiptDate: string; wasteType: string } =>
  typeof item === 'object' &&
  item !== null &&
  'wasteType' in item &&
  'receiptDate' in item;

const isWasteEntry = (
  item: unknown,
): item is {
  code?: string;
  description: string;
  quantity?: number;
  unit?: string;
} =>
  typeof item === 'object' &&
  item !== null &&
  'description' in item &&
  !('receiptDate' in item);

const formatReceiptEntries = (
  name: string,
  items: { quantity: number; receiptDate: string; wasteType: string }[],
  confidence: string,
  indent: string,
): string[] => {
  const grouped = new Map<string, { count: number; total: number }>();

  for (const entry of items) {
    const existing = grouped.get(entry.wasteType) ?? {
      count: 0,
      total: 0,
    };

    existing.count += 1;
    existing.total += entry.quantity;
    grouped.set(entry.wasteType, existing);
  }

  const lines = [
    `${indent}${bold(name)}: ${String(items.length)} entries [${formatConfidence(confidence)}]`,
  ];

  for (const [wasteType, { count, total }] of grouped) {
    lines.push(
      `${indent}  ${wasteType}: ${String(count)} entries (${formatBrazilianQuantity(total)} ton)`,
    );
  }

  return lines;
};

const formatWasteEntries = (
  name: string,
  items: {
    code?: string;
    description: string;
    quantity?: number;
    unit?: string;
  }[],
  confidence: string,
  indent: string,
): string[] => {
  const lines = [`${indent}${bold(name)}: [${formatConfidence(confidence)}]`];

  for (const entry of items) {
    const codePrefix = entry.code ? `${entry.code} - ` : '';
    const qty =
      entry.quantity === undefined
        ? ''
        : `${formatBrazilianQuantity(entry.quantity)} ${entry.unit ?? ''}`;

    const suffix = qty ? `: ${qty.trim()}` : '';

    lines.push(`${indent}  - ${codePrefix}${entry.description}${suffix}`);
  }

  return lines;
};

const formatArrayField = (
  name: string,
  items: unknown[],
  confidence: string,
  indent: string,
): string[] => {
  if (items.length === 0) {
    return [
      `${indent}${bold(name)}: (empty) [${formatConfidence(confidence)}]`,
    ];
  }

  if (items.every((item) => isReceiptEntry(item))) {
    return formatReceiptEntries(name, items, confidence, indent);
  }

  if (items.every((item) => isWasteEntry(item))) {
    return formatWasteEntries(name, items, confidence, indent);
  }

  if (items.every((item) => typeof item === 'string')) {
    return [
      `${indent}${bold(name)}: ${items.join(', ')} [${formatConfidence(confidence)}]`,
    ];
  }

  return [
    `${indent}${bold(name)}: ${JSON.stringify(items)} [${formatConfidence(confidence)}]`,
  ];
};

const formatField = (
  name: string,
  field: unknown,
  indent = '  ',
): string | string[] => {
  if (field === undefined || field === null) {
    return `${indent}${bold(name)}: (not extracted)`;
  }

  if (isExtractedField(field)) {
    if (Array.isArray(field.parsed)) {
      return formatArrayField(name, field.parsed, field.confidence, indent);
    }

    const value =
      typeof field.parsed === 'object'
        ? JSON.stringify(field.parsed)
        : String(field.parsed);

    const displayValue = value === '' ? '(empty in document)' : value;

    return `${indent}${bold(name)}: ${displayValue} [${formatConfidence(field.confidence)}]`;
  }

  return `${indent}${bold(name)}: ${JSON.stringify(field)}`;
};

const METADATA_FIELDS = new Set([
  'documentType',
  'extractionConfidence',
  'lowConfidenceFields',
  'missingRequiredFields',
  'rawText',
]);

const formatBulletList = (
  items: string[],
  colorFunction: (text: string) => string,
): string[] => items.map((item) => `  - ${colorFunction(item)}`);

const pushFieldResult = (lines: string[], result: string | string[]): void => {
  if (Array.isArray(result)) {
    lines.push(...result);
  } else {
    lines.push(result);
  }
};

const formatEntityGroupArrayEntry = (
  entry: Record<string, unknown>,
  index: number,
  indent: string,
): string[] => {
  const lines: string[] = [`${indent}[${String(index)}]:`];
  const lowFields: string[] = [];

  for (const [subKey, subField] of Object.entries(entry)) {
    if (isExtractedField(subField)) {
      const value =
        subField.parsed === undefined || subField.parsed === ''
          ? '(not extracted)'
          : String(subField.parsed);

      lines.push(
        `${indent}  ${bold(subKey)}: ${value} [${formatConfidence(subField.confidence)}]`,
      );

      if (subField.confidence === 'low') {
        lowFields.push(subKey);
      }
    }
  }

  if (lowFields.length > 0) {
    const lowFieldsSummary = `⚠ low: ${lowFields.join(', ')}`;

    lines[0] = `${indent}[${String(index)}]: ${yellow(lowFieldsSummary)}`;
  }

  return lines;
};

const formatExtractedFields = (data: Record<string, unknown>): string[] => {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (METADATA_FIELDS.has(key)) {
      continue;
    }

    if (isExtractedEntityGroupArray(value)) {
      lines.push(`  ${bold(key)}: ${String(value.length)} entries`);

      for (const [index, entry] of value.entries()) {
        lines.push(...formatEntityGroupArrayEntry(entry, index, '    '));
      }
    } else if (isExtractedEntityGroup(value)) {
      lines.push(`  ${bold(key)}:`);

      for (const [subKey, subField] of Object.entries(value)) {
        pushFieldResult(lines, formatField(subKey, subField, '    '));
      }
    } else {
      pushFieldResult(lines, formatField(key, value));
    }
  }

  return lines;
};

export const formatAsHuman = <T extends BaseExtractedData>(
  result: ExtractionOutput<T>,
  options: HumanFormatOptions = {},
): string => {
  const lines: string[] = [
    `\n${bold(blue('=== Document Extraction Result ==='))}\n`,
    `${bold('Document Type:')} ${result.data.documentType}`,
    `${bold('Layout:')} ${result.layoutId ?? 'N/A'}`,
    `${bold('Extraction Confidence:')} ${result.data.extractionConfidence}`,
    `${bold('Review Required:')} ${result.reviewRequired ? red(bold('YES')) : green('NO')}`,
  ];

  if (result.reviewReasons.length > 0) {
    lines.push(
      `\n${bold('Review Reasons:')}`,
      ...formatBulletList(
        result.reviewReasons.map((r) => r.description),
        yellow,
      ),
    );
  }

  if (result.data.missingRequiredFields.length > 0) {
    lines.push(
      `\n${bold('Missing Required Fields:')}`,
      ...formatBulletList(result.data.missingRequiredFields, red),
    );
  }

  if (result.data.lowConfidenceFields.length > 0) {
    lines.push(
      `\n${bold('Low Confidence Fields:')}`,
      ...formatBulletList(result.data.lowConfidenceFields, yellow),
    );
  }

  lines.push(
    `\n${bold('Extracted Fields:')}`,
    ...formatExtractedFields(result.data as unknown as Record<string, unknown>),
  );

  if (options.debug === true) {
    lines.push(`\n${bold(blue('=== Raw Text ==='))}\n`, result.data.rawText);
  }

  lines.push('');

  return lines.join('\n');
};
