import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  ExtractionConfidence,
  ExtractionOutput,
} from './document-extractor.types';

export interface AttachmentInfo {
  attachmentId: string;
  s3Bucket: string;
  s3Key: string;
}

export interface ComparedField {
  event: string;
  extracted: string;
  field: string;
  similarity?: string;
}

/** Level 1: Every comparison produces a match result. All comparisons extend this. */
export interface ComparisonResult {
  isMatch: boolean | null;
}

export interface CrossValidationConfig<
  TEventData,
  TExtractedData extends BaseExtractedData,
  TCrossValidation extends object = Record<string, unknown>,
> {
  getExtractorConfig: (
    eventData: TEventData,
  ) => DocumentExtractorConfig | undefined;
  validate: (
    extractedData: ExtractionOutput<TExtractedData>,
    eventData: TEventData,
  ) => CrossValidationValidateResult<TCrossValidation>;
}

export interface CrossValidationInput<TEventData> {
  attachmentInfo: AttachmentInfo;
  eventData: TEventData;
}

export interface CrossValidationResult<
  TCrossValidation extends object = Record<string, unknown>,
> {
  crossValidation: TCrossValidation;
  extractionMetadata: Record<string, ExtractionMetadata>;
  failMessages: string[];
  failReasons: ReviewReason[];
  passMessages: string[];
  reviewReasons: ReviewReason[];
  reviewRequired: boolean;
}

export interface CrossValidationValidateResult<
  TCrossValidation extends object = Record<string, unknown>,
> {
  crossValidation?: TCrossValidation;
  extractionMetadata?: Record<string, unknown>;
  failMessages: string[];
  failReasons?: ReviewReason[];
  passMessage?: string;
  reviewReasons?: ReviewReason[];
  reviewRequired?: boolean;
}

/** Metadata about a document attachment extraction. */
export interface ExtractionMetadata {
  [key: string]: unknown;
  documentType: string;
  layoutId: null | string;
  layouts: null | string[];
  s3Uri: string;
}

/** Level 2: Simple comparisons with one extracted value vs one event value. */
export interface FieldComparisonBase<
  TExtracted = null | string,
  TEvent = TExtracted,
> extends ComparisonResult {
  confidence: ExtractionConfidence | null;
  event: TEvent;
  extracted: TExtracted;
}

export interface ReviewReason {
  code: string;
  comparedFields?: ComparedField[];
  description: string;
}
