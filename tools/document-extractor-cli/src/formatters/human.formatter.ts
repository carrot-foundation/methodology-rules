import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

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

const formatField = (name: string, field: unknown, indent = '  '): string => {
  if (field === undefined || field === null) {
    return `${indent}${name}: (not extracted)`;
  }

  if (isExtractedField(field)) {
    const confidence = field.confidence === 'high' ? '✓' : '⚠';
    const value =
      typeof field.parsed === 'object'
        ? JSON.stringify(field.parsed)
        : String(field.parsed);

    return `${indent}${name}: ${value} [${confidence} ${field.confidence}]`;
  }

  return `${indent}${name}: ${JSON.stringify(field)}`;
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
    '\n=== Document Extraction Result ===\n',
    `Document Type: ${result.data.documentType}`,
    `Extraction Confidence: ${result.data.extractionConfidence}`,
    `Review Required: ${result.reviewRequired ? 'YES' : 'NO'}`,
  ];

  if (result.reviewReasons.length > 0) {
    lines.push('\nReview Reasons:');

    for (const reason of result.reviewReasons) {
      lines.push(`  - ${reason}`);
    }
  }

  if (result.data.missingRequiredFields.length > 0) {
    lines.push('\nMissing Required Fields:');

    for (const field of result.data.missingRequiredFields) {
      lines.push(`  - ${field}`);
    }
  }

  if (result.data.lowConfidenceFields.length > 0) {
    lines.push('\nLow Confidence Fields:');

    for (const field of result.data.lowConfidenceFields) {
      lines.push(`  - ${field}`);
    }
  }

  lines.push('\nExtracted Fields:');

  for (const [key, value] of Object.entries(result.data)) {
    if (!METADATA_FIELDS.has(key)) {
      lines.push(formatField(key, value));
    }
  }

  if (options.verbose === true) {
    lines.push('\n=== Raw Text ===\n', result.data.rawText);
  }

  lines.push('');

  return lines.join('\n');
};
