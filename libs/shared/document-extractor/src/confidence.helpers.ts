import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type {
  BaseExtractedData,
  DocumentType,
  ExtractedField,
  ExtractionConfidence,
  ExtractionOutput,
} from './document-extractor.types';

const LAYOUT_MATCH_THRESHOLD = 0.3;
const LAYOUT_REVIEW_THRESHOLD = 0.5;
const TEXTRACT_CONFIDENCE_THRESHOLD = 90;

export const createExtractedField = <T>(
  value: T,
  confidence: ExtractionConfidence,
  rawMatch?: string,
): ExtractedField<T> => {
  const field: ExtractedField<T> = {
    confidence,
    parsed: value,
  };

  if (rawMatch !== undefined) {
    field.rawMatch = rawMatch;
  }

  return field;
};

export const createHighConfidenceField = <T>(
  value: T,
  rawMatch?: string,
): ExtractedField<T> => createExtractedField(value, 'high', rawMatch);

export const createLowConfidenceField = <T>(
  value: T,
  rawMatch?: string,
): ExtractedField<T> => createExtractedField(value, 'low', rawMatch);

export const textractConfidenceToExtraction = (
  confidence: number,
): ExtractionConfidence =>
  confidence >= TEXTRACT_CONFIDENCE_THRESHOLD ? 'high' : 'low';

export const createFieldFromTextractConfidence = <T>(
  value: T,
  textractConfidence: number,
  rawMatch?: string,
): ExtractedField<T> =>
  createExtractedField(
    value,
    textractConfidenceToExtraction(textractConfidence),
    rawMatch,
  );

export const mergeConfidence = (
  parsingConfidence: ExtractionConfidence,
  textractConfidence: number,
): ExtractionConfidence =>
  parsingConfidence === 'low' ||
  textractConfidence < TEXTRACT_CONFIDENCE_THRESHOLD
    ? 'low'
    : 'high';

export const calculateOverallConfidence = (
  fields: Array<ExtractedField<unknown> | undefined>,
): ExtractionConfidence => {
  const definedFields = fields.filter(
    (field): field is ExtractedField<unknown> => field !== undefined,
  );

  if (definedFields.length === 0) {
    return 'low';
  }

  const hasLowConfidence = definedFields.some(
    (field) => field.confidence === 'low',
  );

  return hasLowConfidence ? 'low' : 'high';
};

const isExtractedField = (value: unknown): value is ExtractedField<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'parsed' in value &&
  'confidence' in value;

const isExtractedEntityGroup = (
  value: unknown,
): value is Record<string, ExtractedField<unknown>> =>
  typeof value === 'object' &&
  value !== null &&
  !('parsed' in value) &&
  Object.values(value as Record<string, unknown>).some((v) =>
    isExtractedField(v),
  );

const isExtractedEntityGroupArray = (
  value: unknown,
): value is Array<Record<string, unknown>> =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => isExtractedEntityGroup(item));

const collectLowConfidenceFromGroup = (
  group: Record<string, unknown>,
  prefix: string,
  result: string[],
): void => {
  for (const [subKey, subField] of Object.entries(group)) {
    if (isExtractedField(subField) && subField.confidence === 'low') {
      result.push(`${prefix}.${subKey}`);
    }
  }
};

export const collectLowConfidenceFields = (
  data: Record<string, unknown>,
  fieldNames: string[],
): string[] => {
  const result: string[] = [];

  for (const fieldName of fieldNames) {
    const field = data[fieldName];

    if (isExtractedField(field)) {
      if (field.confidence === 'low') {
        result.push(fieldName);
      }
    } else if (Array.isArray(field) && isExtractedEntityGroupArray(field)) {
      for (const [index, entry] of field.entries()) {
        collectLowConfidenceFromGroup(
          entry,
          `${fieldName}[${String(index)}]`,
          result,
        );
      }
    } else if (isExtractedEntityGroup(field)) {
      collectLowConfidenceFromGroup(field, fieldName, result);
    }
  }

  return result;
};

export const collectMissingRequiredFields = (
  data: Record<string, unknown>,
  requiredFieldNames: string[],
): string[] =>
  requiredFieldNames.filter((fieldName) => {
    const field = data[fieldName];

    return field === undefined;
  });

export const buildExtractionOutput = <T extends BaseExtractedData>(
  data: T,
  layoutMatchScore: number,
): ExtractionOutput<T> => {
  const reviewReasons: string[] = [];

  if (data.missingRequiredFields.length > 0) {
    reviewReasons.push(
      `Missing required fields: ${data.missingRequiredFields.join(', ')}`,
    );
  }

  if (data.lowConfidenceFields.length > 0) {
    reviewReasons.push(
      `Low confidence fields: ${data.lowConfidenceFields.join(', ')}`,
    );
  }

  if (layoutMatchScore < LAYOUT_REVIEW_THRESHOLD) {
    reviewReasons.push(
      `Layout match score (${layoutMatchScore.toFixed(2)}) below review threshold (${LAYOUT_REVIEW_THRESHOLD})`,
    );
  }

  return {
    data,
    reviewReasons,
    reviewRequired: reviewReasons.length > 0,
  };
};

export const calculateMatchScore = (
  text: string,
  patterns: RegExp[],
): number => {
  if (patterns.length === 0) {
    return 0;
  }

  const matchedCount = patterns.filter((pattern) => pattern.test(text)).length;

  return matchedCount / patterns.length;
};

export const isAboveMatchThreshold = (score: number): boolean =>
  score >= LAYOUT_MATCH_THRESHOLD;

export const MATCH_THRESHOLDS = {
  layout: LAYOUT_MATCH_THRESHOLD,
  review: LAYOUT_REVIEW_THRESHOLD,
  textractConfidence: TEXTRACT_CONFIDENCE_THRESHOLD,
} as const;

export interface FinalizeExtractionInput<T extends BaseExtractedData> {
  allFields: readonly string[];
  confidenceFields: Array<ExtractedField<unknown> | undefined>;
  documentType: DocumentType;
  matchScore: number;
  partialData: Partial<T>;
  rawText: NonEmptyString;
  requiredFields: readonly string[];
}

export const finalizeExtraction = <T extends BaseExtractedData>(
  input: FinalizeExtractionInput<T>,
): ExtractionOutput<T> => {
  const {
    allFields,
    confidenceFields,
    documentType,
    matchScore,
    partialData,
    rawText,
    requiredFields,
  } = input;

  const missingRequiredFields = collectMissingRequiredFields(partialData, [
    ...requiredFields,
  ]);
  const lowConfidenceFields = collectLowConfidenceFields(partialData, [
    ...allFields,
  ]);
  const extractionConfidence = calculateOverallConfidence(confidenceFields);

  const data: T = {
    ...partialData,
    documentType,
    extractionConfidence,
    lowConfidenceFields,
    missingRequiredFields,
    rawText,
  } as T;

  return buildExtractionOutput(data, matchScore);
};
