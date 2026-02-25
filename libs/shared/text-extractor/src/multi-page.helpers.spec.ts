import type { TextExtractionResult } from './text-extractor.types';

import { normalizeMultiPageBlocks } from './multi-page.helpers';

type TextBlock = TextExtractionResult['blocks'][number];

const makeBlock = (top: number, left = 0.1, text = 'text'): TextBlock => ({
  blockType: 'LINE',
  boundingBox: { height: 0.015, left, top, width: 0.2 },
  id: `block-${top}-${left}`,
  text,
});

describe('normalizeMultiPageBlocks', () => {
  it('should return single-page blocks unchanged', () => {
    const blocks: TextBlock[] = [
      makeBlock(0.1),
      makeBlock(0.3),
      makeBlock(0.8),
    ];

    const result = normalizeMultiPageBlocks(blocks);

    expect(result[0]?.boundingBox?.top).toBe(0.1);
    expect(result[1]?.boundingBox?.top).toBe(0.3);
    expect(result[2]?.boundingBox?.top).toBe(0.8);
  });

  it('should offset page 2 blocks by 1.0', () => {
    const blocks: TextBlock[] = [
      makeBlock(0.1),
      makeBlock(0.9),
      // page break: top resets from 0.9 to 0.05
      makeBlock(0.05),
      makeBlock(0.3),
    ];

    const result = normalizeMultiPageBlocks(blocks);

    expect(result[0]?.boundingBox?.top).toBeCloseTo(0.1);
    expect(result[1]?.boundingBox?.top).toBeCloseTo(0.9);
    expect(result[2]?.boundingBox?.top).toBeCloseTo(1.05);
    expect(result[3]?.boundingBox?.top).toBeCloseTo(1.3);
  });

  it('should offset page 3 blocks by 2.0', () => {
    const blocks: TextBlock[] = [
      makeBlock(0.9),
      makeBlock(0.05), // page 2 start
      makeBlock(0.9),
      makeBlock(0.05), // page 3 start
      makeBlock(0.2),
    ];

    const result = normalizeMultiPageBlocks(blocks);

    expect(result[4]?.boundingBox?.top).toBeCloseTo(2.2);
  });

  it('should pass through blocks without boundingBox unchanged', () => {
    const blocks: TextBlock[] = [
      { blockType: 'LINE', id: 'no-bb', text: 'hello' },
      makeBlock(0.1),
    ];

    const result = normalizeMultiPageBlocks(blocks);

    expect(result[0]?.boundingBox).toBeUndefined();
    expect(result[1]?.boundingBox?.top).toBe(0.1);
  });

  it('should return empty array for empty input', () => {
    expect(normalizeMultiPageBlocks([])).toEqual([]);
  });

  it('should not mutate input blocks', () => {
    const blocks: TextBlock[] = [makeBlock(0.9), makeBlock(0.05)];
    const original = blocks[1]!.boundingBox!.top;

    normalizeMultiPageBlocks(blocks);

    expect(blocks[1]?.boundingBox?.top).toBe(original);
  });

  it('should not detect false page break at LINE-to-WORD block transition', () => {
    const blocks: TextBlock[] = [
      {
        blockType: 'LINE',
        boundingBox: { height: 0.015, left: 0.1, top: 0.9, width: 0.2 },
        id: 'line-last',
        text: 'last line',
      },
      // WORD block at top of same page (appears at top because block order is LINE blocks then WORD blocks)
      {
        blockType: 'WORD',
        boundingBox: { height: 0.015, left: 0.1, top: 0.03, width: 0.1 },
        id: 'word-1',
        text: 'word',
      },
      // Actual page 2 LINE block
      {
        blockType: 'LINE',
        boundingBox: { height: 0.015, left: 0.1, top: 0.02, width: 0.2 },
        id: 'line-p2',
        text: 'page 2 line',
      },
    ];

    const result = normalizeMultiPageBlocks(blocks);

    // WORD block should NOT trigger page break
    expect(result[1]?.boundingBox?.top).toBeCloseTo(0.03); // no offset
    // LINE block at top of page 2 SHOULD trigger page break (LINE→LINE transition)
    expect(result[2]?.boundingBox?.top).toBeCloseTo(1.02);
  });
});
