import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

import { blue, bold, green, red, yellow } from '@carrot-fndn/shared/cli';

interface HumanFormatOptions {
  verbose?: boolean;
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
  Object.values(value as Record<string, unknown>).some((v) =>
    isExtractedField(v),
  );

const formatConfidence = (confidence: string): string => {
  const icon = confidence === 'high' ? '✓' : '⚠';
  const text = `${icon} ${confidence}`;

  return confidence === 'high' ? green(text) : yellow(text);
};

const formatField = (name: string, field: unknown, indent = '  '): string => {
  if (field === undefined || field === null) {
    return `${indent}${bold(name)}: (not extracted)`;
  }

  if (isExtractedField(field)) {
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

const formatExtractedFields = (data: Record<string, unknown>): string[] => {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (METADATA_FIELDS.has(key)) {
      continue;
    }

    if (isExtractedEntityGroup(value)) {
      lines.push(`  ${bold(key)}:`);

      for (const [subKey, subField] of Object.entries(value)) {
        lines.push(formatField(subKey, subField, '    '));
      }
    } else {
      lines.push(formatField(key, value));
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
      ...formatBulletList(result.reviewReasons, yellow),
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

  if (options.verbose === true) {
    lines.push(`\n${bold(blue('=== Raw Text ==='))}\n`, result.data.rawText);
  }

  lines.push('');

  return lines.join('\n');
};
