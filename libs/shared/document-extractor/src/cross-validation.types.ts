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

export interface ExtractionMetadata {
  [key: string]: unknown;
  documentType: string;
  layoutId: null | string;
  layouts: null | string[];
  s3Uri: string;
}

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
