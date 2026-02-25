import type { TextExtractionResult } from './text-extractor.types';

export const stubTextExtractionResult = (
  rawText: TextExtractionResult['rawText'],
): TextExtractionResult => ({
  blocks: [],
  rawText,
});

export const stubTextExtractionResultWithBlocks = (
  rawText: string,
  blockInputs: Array<{
    boundingBox?: { height: number; left: number; top: number; width: number };
    text: string;
  }>,
): TextExtractionResult => ({
  blocks: blockInputs.map((input, index) => ({
    blockType: 'LINE',
    ...(input.boundingBox ? { boundingBox: input.boundingBox } : {}),
    id: `stub-${String(index)}`,
    text: input.text,
  })),
  rawText,
});
