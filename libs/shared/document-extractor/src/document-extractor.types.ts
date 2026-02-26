import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ReviewReason } from './cross-validation.types';

export interface BaseExtractedData {
  documentType: DocumentType;
  extractionConfidence: ExtractionConfidence;
  lowConfidenceFields: string[];
  rawText: NonEmptyString;
}

export interface DocumentExtractorConfig {
  documentType?: DocumentType | undefined;
  layouts?: NonEmptyString[] | undefined;
  textExtractionResult?: TextExtractionResult | undefined;
}

export interface DocumentParser<T extends BaseExtractedData> {
  readonly documentType: DocumentType;
  getMatchScore(extractionResult: TextExtractionResult): number;
  readonly layoutId: NonEmptyString;
  parse(extractionResult: TextExtractionResult): ExtractionOutput<T>;
  readonly textractMode?: 'analyze' | 'detect';
}

export type DocumentType =
  | 'recyclingManifest'
  | 'scaleTicket'
  | 'transportManifest';

export interface ExtractedField<T> {
  confidence: ExtractionConfidence;
  parsed: T;
  rawMatch?: string;
}

export type ExtractionConfidence = 'high' | 'low';

export interface ExtractionOutput<T extends BaseExtractedData> {
  data: T;
  layoutId?: NonEmptyString;
  reviewReasons: ReviewReason[];
  reviewRequired: boolean;
  textExtractionResult?: TextExtractionResult;
}

export interface LayoutConfig {
  documentType: DocumentType;
  layoutId: NonEmptyString;
}
