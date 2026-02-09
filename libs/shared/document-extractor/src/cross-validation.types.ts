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
  ) => { failMessages: string[] };
}

export interface CrossValidationInput<TEventData> {
  attachmentInfo: AttachmentInfo;
  eventData: TEventData;
}

export interface CrossValidationResult {
  failMessages: string[];
  reviewReasons: string[];
  reviewRequired: boolean;
}
