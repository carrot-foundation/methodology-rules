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
  parse(extractionResult: TextractExtractionResult): T;
}

export interface TextractExtractionResult {
  blocks: Array<{
    blockType?: string;
    id: string;
    text?: string;
  }>;
  rawText: NonEmptyString;
}
