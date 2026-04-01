import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ReviewReason } from './cross-validation.types';

export interface BaseExtractedData {
  documentType: BoldDocumentType;
  extractionConfidence: ExtractionConfidence;
  lowConfidenceFields: string[];
  rawText: NonEmptyString;
}

export type BoldDocumentType =
  | 'recyclingManifest'
  | 'scaleTicket'
  | 'transportManifest';

export interface DocumentExtractorConfig {
  documentType?: BoldDocumentType | undefined;
  layouts?: NonEmptyString[] | undefined;
  textExtractionResult?: TextExtractionResult | undefined;
}

export interface DocumentParser<T extends BaseExtractedData> {
  readonly documentType: BoldDocumentType;
  getMatchScore(extractionResult: TextExtractionResult): number;
  readonly layoutId: NonEmptyString;
  parse(extractionResult: TextExtractionResult): ExtractionOutput<T>;
  readonly textractMode?: 'analyze' | 'detect';
}

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
  documentType: BoldDocumentType;
  layoutId: NonEmptyString;
}
