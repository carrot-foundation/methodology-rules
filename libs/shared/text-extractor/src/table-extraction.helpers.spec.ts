import type { TextExtractionResult } from './text-extractor.types';

import {
  detectTableColumns,
  extractTableFromBlocks,
  type HeaderColumnDefinition,
  type TableColumnConfig,
  type TableExtractionConfig,
} from './table-extraction.helpers';

type TextBlock = TextExtractionResult['blocks'][number];

const makeBlock = (
  text: string,
  left: number,
  top: number,
  overrides?: Partial<TextBlock>,
): TextBlock => ({
  blockType: 'LINE',
  boundingBox: { height: 0.015, left, top, width: 0.1 },
  id: `block-${top}-${left}`,
  text,
  ...overrides,
});

const SIMPLE_TABLE_CONFIG: TableExtractionConfig = {
  anchorColumn: 'item',
  columns: [
    { headerLeft: 0.05, name: 'item' },
    { headerLeft: 0.1, name: 'description' },
    { headerLeft: 0.5, name: 'quantity' },
  ],
};

describe('extractTableFromBlocks', () => {
  it('should extract a single-row table', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      makeBlock('100', 0.5, 0.3),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([
      { description: 'Widget A', item: '1', quantity: '100' },
    ]);
  });

  it('should extract multiple rows', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      makeBlock('100', 0.5, 0.3),
      makeBlock('2', 0.05, 0.35),
      makeBlock('Widget B', 0.1, 0.35),
      makeBlock('200', 0.5, 0.35),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      description: 'Widget A',
      item: '1',
      quantity: '100',
    });
    expect(rows[1]).toEqual({
      description: 'Widget B',
      item: '2',
      quantity: '200',
    });
  });

  it('should merge continuation rows (no anchor value)', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Long description that', 0.1, 0.3),
      makeBlock('100', 0.5, 0.3),
      // continuation row — no anchor column
      makeBlock('continues here', 0.1, 0.35),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      description: 'Long description that continues here',
      item: '1',
      quantity: '100',
    });
  });

  it('should filter out non-LINE blocks', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      makeBlock('100', 0.5, 0.3, { blockType: 'WORD' }),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  it('should filter out blocks without boundingBox', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      {
        blockType: 'LINE',
        id: 'no-bb',
        text: '100',
      },
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  it('should apply yRange filter', () => {
    const blocks: TextBlock[] = [
      // Above range — should be excluded
      makeBlock('Header', 0.05, 0.1),
      // In range
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      // Below range — should be excluded
      makeBlock('Footer', 0.05, 0.9),
    ];

    const config: TableExtractionConfig = {
      ...SIMPLE_TABLE_CONFIG,
      yRange: { max: 0.5, min: 0.2 },
    };

    const { rows } = extractTableFromBlocks(blocks, config);

    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  it('should return empty rows when no LINE blocks with geometry exist', () => {
    const blocks: TextBlock[] = [{ blockType: 'WORD', id: '1', text: 'word' }];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([]);
  });

  it('should return empty rows when all blocks are empty text', () => {
    const blocks: TextBlock[] = [makeBlock('', 0.05, 0.3)];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([]);
  });

  it('should handle blocks on the same Y within tolerance', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.305), // within default 0.008 tolerance
      makeBlock('100', 0.5, 0.302),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([
      { description: 'Widget A', item: '1', quantity: '100' },
    ]);
  });

  it('should add new columns from continuation rows', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      // continuation row adds a new column (quantity) not in anchor row
      makeBlock('50', 0.5, 0.35),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      description: 'Widget A',
      item: '1',
      quantity: '50',
    });
  });

  it('should skip continuation rows before any anchor row', () => {
    const blocks: TextBlock[] = [
      // No anchor — should be skipped
      makeBlock('orphaned text', 0.1, 0.25),
      // Row with anchor
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  it('should handle blocks outside any column range', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.3),
      // Far right, outside last column range
      makeBlock('stray', 0.001, 0.3),
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  it('should concatenate multiple blocks in the same column', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Part 1', 0.1, 0.3),
      makeBlock('Part 2', 0.15, 0.3), // still in 'description' column range
    ];

    const { rows } = extractTableFromBlocks(blocks, SIMPLE_TABLE_CONFIG);

    expect(rows).toEqual([{ description: 'Part 1 Part 2', item: '1' }]);
  });

  it('should use custom yTolerance and xTolerance', () => {
    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.1, 0.32), // 0.02 apart — outside default 0.008
    ];

    const config: TableExtractionConfig = {
      ...SIMPLE_TABLE_CONFIG,
      yTolerance: 0.025,
    };

    const { rows } = extractTableFromBlocks(blocks, config);

    // With larger tolerance, these are in the same visual row
    expect(rows).toEqual([{ description: 'Widget A', item: '1' }]);
  });

  describe('CETESB-like table', () => {
    const CETESB_CONFIG: TableExtractionConfig = {
      anchorColumn: 'item',
      columns: [
        { headerLeft: 0.048, name: 'item' },
        { headerLeft: 0.098, name: 'description' },
        { headerLeft: 0.474, name: 'physicalState' },
        { headerLeft: 0.567, name: 'classification' },
        { headerLeft: 0.624, name: 'packaging' },
        { headerLeft: 0.767, name: 'quantity' },
        { headerLeft: 0.823, name: 'unit' },
        { headerLeft: 0.886, name: 'treatment' },
      ],
    };

    it('should extract a CETESB waste table row with continuation', () => {
      const blocks: TextBlock[] = [
        // Row 1 — item present
        makeBlock('1', 0.048, 0.4),
        makeBlock(
          '190812-Lodos de tratamento biológico de efluentes industriais não',
          0.098,
          0.4,
        ),
        makeBlock('SEMISSÓLIDO', 0.474, 0.4),
        makeBlock('CLASSE', 0.567, 0.4),
        makeBlock('CAÇAMBA ABERTA', 0.624, 0.4),
        makeBlock('13,4700', 0.767, 0.4),
        makeBlock('TON', 0.823, 0.4),
        makeBlock('Compostagem', 0.886, 0.4),
        // Continuation — no item
        makeBlock('abrangidos em 08 11 (*)', 0.098, 0.42),
        makeBlock('IIA', 0.567, 0.42),
      ];

      const { rows } = extractTableFromBlocks(blocks, CETESB_CONFIG);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        classification: 'CLASSE IIA',
        description:
          '190812-Lodos de tratamento biológico de efluentes industriais não abrangidos em 08 11 (*)',
        item: '1',
        packaging: 'CAÇAMBA ABERTA',
        physicalState: 'SEMISSÓLIDO',
        quantity: '13,4700',
        treatment: 'Compostagem',
        unit: 'TON',
      });
    });

    it('should extract multiple CETESB waste table rows', () => {
      const blocks: TextBlock[] = [
        makeBlock('1', 0.048, 0.4),
        makeBlock('190812-Lodos de tratamento', 0.098, 0.4),
        makeBlock('SEMISSÓLIDO', 0.474, 0.4),
        makeBlock('13,4700', 0.767, 0.4),
        makeBlock('TON', 0.823, 0.4),
        makeBlock('2', 0.048, 0.45),
        makeBlock('020101-Lodos de lavagem', 0.098, 0.45),
        makeBlock('SÓLIDO', 0.474, 0.45),
        makeBlock('5,0000', 0.767, 0.45),
        makeBlock('KG', 0.823, 0.45),
      ];

      const { rows } = extractTableFromBlocks(blocks, CETESB_CONFIG);

      expect(rows).toHaveLength(2);
      expect(rows[0]!['description']).toBe('190812-Lodos de tratamento');
      expect(rows[1]!['description']).toBe('020101-Lodos de lavagem');
    });
  });

  it('should exclude continuation rows that exceed maxRowGap', () => {
    const config: TableExtractionConfig = {
      anchorColumn: 'item',
      columns: [
        { headerLeft: 0.05, name: 'item' },
        { headerLeft: 0.1, name: 'description' },
      ],
      maxRowGap: 0.1,
    };

    const blocks: TextBlock[] = [
      makeBlock('1', 0.05, 0.3),
      makeBlock('First entry', 0.1, 0.3),
      // Close continuation — should be merged
      makeBlock('continued text', 0.1, 0.32),
      // Far-away text — should NOT be merged
      makeBlock('Footer disclaimer text', 0.1, 0.8),
    ];

    const { rows } = extractTableFromBlocks(blocks, config);

    expect(rows).toHaveLength(1);
    expect(rows[0]!['description']).toBe('First entry continued text');
  });
});

describe('detectTableColumns', () => {
  const HEADER_DEFS: [HeaderColumnDefinition, ...HeaderColumnDefinition[]] = [
    { headerPattern: 'Item', name: 'item' },
    { headerPattern: 'Description', name: 'description' },
    { headerPattern: 'Quantity', name: 'quantity' },
  ];

  it('should detect columns from header blocks using string patterns', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      makeBlock('Quantity', 0.6, 0.2),
      // Data rows below
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget', 0.2, 0.3),
    ];

    const result = detectTableColumns(blocks, HEADER_DEFS);

    expect(result).toEqual({
      columns: [
        { headerLeft: 0.05, name: 'item' },
        { headerLeft: 0.2, name: 'description' },
        { headerLeft: 0.6, name: 'quantity' },
      ],
      headerTop: 0.2,
    });
  });

  it('should detect columns using regex patterns', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Código IBAMA e Denominação', 0.1, 0.2),
      makeBlock('Qtde', 0.7, 0.2),
    ];

    const regexDefs: [HeaderColumnDefinition, ...HeaderColumnDefinition[]] = [
      { headerPattern: /^Item$/i, name: 'item' },
      { headerPattern: /^C[oó]digo\s+IBAMA/i, name: 'description' },
      { headerPattern: /^Qtde$/i, name: 'quantity' },
    ];

    const result = detectTableColumns(blocks, regexDefs);

    expect(result?.columns).toEqual([
      { headerLeft: 0.05, name: 'item' },
      { headerLeft: 0.1, name: 'description' },
      { headerLeft: 0.7, name: 'quantity' },
    ]);
  });

  it('should return undefined when a header is missing', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      // Missing 'Quantity'
    ];

    const columns = detectTableColumns(blocks, HEADER_DEFS);

    expect(columns).toBeUndefined();
  });

  it('should return undefined when headers are not on the same row', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      makeBlock('Quantity', 0.6, 0.35), // different Y
    ];

    const columns = detectTableColumns(blocks, HEADER_DEFS);

    expect(columns).toBeUndefined();
  });

  it('should match string patterns case-insensitively', () => {
    const blocks: TextBlock[] = [
      makeBlock('item', 0.05, 0.2),
      makeBlock('DESCRIPTION', 0.2, 0.2),
      makeBlock('quantity', 0.6, 0.2),
    ];

    const result = detectTableColumns(blocks, HEADER_DEFS);

    expect(result?.columns).toEqual([
      { headerLeft: 0.05, name: 'item' },
      { headerLeft: 0.2, name: 'description' },
      { headerLeft: 0.6, name: 'quantity' },
    ]);
  });

  it('should return columns sorted by headerLeft', () => {
    const blocks: TextBlock[] = [
      // Blocks in reverse order
      makeBlock('Quantity', 0.6, 0.2),
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
    ];

    const result = detectTableColumns(blocks, HEADER_DEFS);

    expect(result?.columns).toEqual([
      { headerLeft: 0.05, name: 'item' },
      { headerLeft: 0.2, name: 'description' },
      { headerLeft: 0.6, name: 'quantity' },
    ]);
  });

  it('should skip blocks without geometry', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      { blockType: 'LINE', id: 'no-bb', text: 'Quantity' },
    ];

    const columns = detectTableColumns(blocks, HEADER_DEFS);

    expect(columns).toBeUndefined();
  });

  it('should use custom yTolerance', () => {
    const blocks: TextBlock[] = [
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      makeBlock('Quantity', 0.6, 0.22), // 0.02 apart — beyond default 0.008
    ];

    expect(detectTableColumns(blocks, HEADER_DEFS)).toBeUndefined();

    const result = detectTableColumns(blocks, HEADER_DEFS, {
      yTolerance: 0.03,
    });

    expect(result?.columns).toEqual([
      { headerLeft: 0.05, name: 'item' },
      { headerLeft: 0.2, name: 'description' },
      { headerLeft: 0.6, name: 'quantity' },
    ]);
  });

  it('should work end-to-end with extractTableFromBlocks', () => {
    const blocks: TextBlock[] = [
      // Header row
      makeBlock('Item', 0.05, 0.2),
      makeBlock('Description', 0.2, 0.2),
      makeBlock('Quantity', 0.6, 0.2),
      // Data rows
      makeBlock('1', 0.05, 0.3),
      makeBlock('Widget A', 0.2, 0.3),
      makeBlock('100', 0.6, 0.3),
    ];

    const detected = detectTableColumns(blocks, HEADER_DEFS);

    expect(detected).toBeDefined();

    const config: TableExtractionConfig = {
      anchorColumn: 'item',
      columns: detected!.columns as [TableColumnConfig, ...TableColumnConfig[]],
      yRange: { max: 1, min: detected!.headerTop + 0.01 },
    };

    const { rows } = extractTableFromBlocks(blocks, config);

    expect(rows).toEqual([
      {
        description: 'Widget A',
        item: '1',
        quantity: '100',
      },
    ]);
  });
});
