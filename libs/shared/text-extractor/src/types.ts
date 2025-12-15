import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface ExtractedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  rawText: NonEmptyString | undefined;
}

export interface ExtractionError {
  cause?: unknown;
  message: string;
}

export interface Parser<T> {
  parse(extractionResult: TextExtractionResult): T;
}

export interface TextExtractionInput {
  filePath?: string;
  s3Bucket?: string;
  s3Key?: string;
}

export interface TextExtractionResult {
  blocks: Array<{
    blockType?: string;
    id: string;
    text?: string;
  }>;
  rawText: NonEmptyString;
}

export interface TextExtractor {
  extractText(input: TextExtractionInput): Promise<TextExtractionResult>;
}
