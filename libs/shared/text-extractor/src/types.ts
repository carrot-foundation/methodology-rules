export interface ExtractedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  rawText: string | undefined;
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
  rawText: string;
}
