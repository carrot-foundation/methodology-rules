import type { Block } from '@aws-sdk/client-textract';
import type { NormalizedTextractBlock } from '@carrot-fndn/shared/types';

export function normalizeTextractBlocksResponse(
  blocks: Block[],
): NormalizedTextractBlock[] {
  const normalizedBlocks: NormalizedTextractBlock[] = [];
  let currentPage = 1;

  for (const block of blocks) {
    if (block.BlockType === 'PAGE') {
      currentPage = normalizedBlocks.length + 1;
    } else if (
      block.BlockType === 'LINE' &&
      block.Text &&
      typeof block.Confidence === 'number' &&
      block.Confidence > 0
    ) {
      normalizedBlocks.push({
        confidence: block.Confidence,
        page: currentPage,
        text: block.Text,
        type: block.BlockType,
      });
    }
  }

  return normalizedBlocks;
}
