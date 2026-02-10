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
    lines.push(`\n${bold('Review Reasons:')}`);

    for (const reason of result.reviewReasons) {
      lines.push(`  - ${yellow(reason)}`);
    }
  }

  if (result.data.missingRequiredFields.length > 0) {
    lines.push(`\n${bold('Missing Required Fields:')}`);

    for (const field of result.data.missingRequiredFields) {
      lines.push(`  - ${red(field)}`);
    }
  }

  if (result.data.lowConfidenceFields.length > 0) {
    lines.push(`\n${bold('Low Confidence Fields:')}`);

    for (const field of result.data.lowConfidenceFields) {
      lines.push(`  - ${yellow(field)}`);
    }
  }

  lines.push(`\n${bold('Extracted Fields:')}`);

  for (const [key, value] of Object.entries(result.data)) {
    if (!METADATA_FIELDS.has(key)) {
      lines.push(formatField(key, value));
    }
  }

  if (options.verbose === true) {
    lines.push(`\n${bold(blue('=== Raw Text ==='))}\n`, result.data.rawText);
  }

  lines.push('');

  return lines.join('\n');
};
