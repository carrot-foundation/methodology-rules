import type { TextExtractionResult } from './text-extractor.types';

type TextBlock = TextExtractionResult['blocks'][number];

const DEFAULT_PAGE_BREAK_THRESHOLD = 0.5;

export const normalizeMultiPageBlocks = (
  blocks: readonly TextBlock[],
  pageBreakThreshold = DEFAULT_PAGE_BREAK_THRESHOLD,
): TextBlock[] => {
  const result: TextBlock[] = [];
  let pageOffset = 0;
  let lastTop: number | undefined;

  for (const block of blocks) {
    if (!block.boundingBox) {
      result.push(block);
      continue;
    }

    const { top } = block.boundingBox;

    if (lastTop !== undefined && lastTop - top > pageBreakThreshold) {
      pageOffset += 1;
    }

    lastTop = top;

    result.push({
      ...block,
      boundingBox: { ...block.boundingBox, top: top + pageOffset },
    });
  }

  return result;
};
