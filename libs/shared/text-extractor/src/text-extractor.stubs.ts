import type { TextExtractionResult } from './text-extractor.types';

export const stubTextExtractionResult = (
  rawText: string,
): TextExtractionResult => ({
  blocks: [],
  rawText,
});
