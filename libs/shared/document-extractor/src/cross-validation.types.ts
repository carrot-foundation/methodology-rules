import type {
  BaseExtractedData,
  DocumentExtractorConfig,
  ExtractionOutput,
} from './document-extractor.types';

export interface AttachmentInfo {
  attachmentId: string;
  s3Bucket: string;
  s3Key: string;
}

export interface CrossValidationConfig<
  TEventData,
  TExtractedData extends BaseExtractedData,
> {
  getExtractorConfig: (
    eventData: TEventData,
  ) => DocumentExtractorConfig | undefined;
  validate: (
    extractedData: ExtractionOutput<TExtractedData>,
    eventData: TEventData,
  ) => CrossValidationValidateResult;
}

export interface CrossValidationInput<TEventData> {
  attachmentInfo: AttachmentInfo;
  eventData: TEventData;
}

export interface CrossValidationResult {
  crossValidation: Record<string, unknown>;
  failMessages: string[];
  reviewReasons: string[];
  reviewRequired: boolean;
}

export interface CrossValidationValidateResult {
  crossValidation?: Record<string, unknown>;
  failMessages: string[];
  reviewReasons?: string[];
  reviewRequired?: boolean;
}
