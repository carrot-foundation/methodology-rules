import type { TextExtractionResult } from './text-extractor.types';

export interface HeaderColumnDefinition<TColumn extends string = string> {
  headerPattern: RegExp | string;
  name: TColumn;
  optional?: boolean;
}

export interface TableColumnConfig<TColumn extends string = string> {
  headerLeft: number;
  name: TColumn;
}

export interface TableExtractionConfig<TColumn extends string = string> {
  anchorColumn: TColumn;
  columns: [TableColumnConfig<TColumn>, ...Array<TableColumnConfig<TColumn>>];
  /**
   * Optional predicate to determine if an anchor value starts a new row.
   * When omitted, any non-empty anchor value starts a new row.
   * When provided, rows whose anchor value does not satisfy the predicate
   * are merged into the previous row (all columns carried over).
   */
  isNewRow?: (anchorValue: string) => boolean;
  maxRowGap?: number;
  splitSpanningLines?: boolean;
  xTolerance?: number;
  yRange?: { max: number; min: number };
  yTolerance?: number;
}

export type TableRow<TColumn extends string = string> = {
  [K in TColumn]?: string;
};

interface ColumnRange {
  max: number;
  min: number;
  name: string;
}

type TextBlock = TextExtractionResult['blocks'][number];

const DEFAULT_Y_TOLERANCE = 0.008;
const DEFAULT_X_TOLERANCE = 0.005;

const filterLineBlocks = (
  blocks: readonly TextBlock[],
  yRange: undefined | { max: number; min: number },
): TextBlock[] => {
  const filtered = blocks.filter(
    (block) =>
      block.blockType === 'LINE' &&
      block.text !== undefined &&
      block.text.length > 0 &&
      block.boundingBox !== undefined,
  );

  const ranged = yRange
    ? filtered.filter((block) => {
        const top = block.boundingBox!.top;

        return top >= yRange.min && top <= yRange.max;
      })
    : filtered;

  return ranged.sort((a, b) => a.boundingBox!.top - b.boundingBox!.top);
};

const buildColumnRanges = (
  columns: readonly TableColumnConfig[],
  xTolerance: number,
): ColumnRange[] =>
  columns.map((column, index) => {
    const previousColumn = columns[index - 1];
    const nextColumn = columns[index + 1];

    return {
      max: nextColumn
        ? (column.headerLeft + nextColumn.headerLeft) / 2
        : Number.POSITIVE_INFINITY,
      min: previousColumn
        ? (previousColumn.headerLeft + column.headerLeft) / 2
        : column.headerLeft - xTolerance,
      name: column.name,
    };
  });

const clusterBlocksByY = (
  blocks: readonly TextBlock[],
  yTolerance: number,
): TextBlock[][] => {
  const clusters: TextBlock[][] = [];
  let currentCluster: TextBlock[] = [];
  let lastTop: number | undefined;

  for (const block of blocks) {
    const top = block.boundingBox!.top;

    if (lastTop === undefined || Math.abs(top - lastTop) <= yTolerance) {
      currentCluster.push(block);
    } else {
      clusters.push(currentCluster);
      currentCluster = [block];
    }

    lastTop = top;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
};

const rightEdge = (block: TextBlock): number =>
  block.boundingBox!.left + block.boundingBox!.width;

const findColumnIndex = (
  left: number,
  columnRanges: readonly ColumnRange[],
): number =>
  columnRanges.findIndex((range) => left >= range.min && left < range.max);

const spansIntoLaterColumn = (
  line: TextBlock,
  columns: readonly TableColumnConfig[],
  columnRanges: readonly ColumnRange[],
): boolean => {
  const index = findColumnIndex(line.boundingBox!.left, columnRanges);
  const nextColumn = index === -1 ? undefined : columns[index + 1];

  return nextColumn !== undefined && rightEdge(line) > nextColumn.headerLeft;
};

const findLineWords = (
  line: TextBlock,
  blocks: readonly TextBlock[],
  xTolerance: number,
): TextBlock[] => {
  const { height, left, top } = line.boundingBox!;
  const right = rightEdge(line);

  return blocks
    .filter((block) => {
      if (
        block.blockType !== 'WORD' ||
        !block.text ||
        block.boundingBox === undefined
      ) {
        return false;
      }

      const center = block.boundingBox.top + block.boundingBox.height / 2;

      return (
        center >= top &&
        center <= top + height &&
        block.boundingBox.left >= left - xTolerance &&
        rightEdge(block) <= right + xTolerance
      );
    })
    .sort((a, b) => a.boundingBox!.left - b.boundingBox!.left);
};

// Words closer than the line height belong to one cell; wider gaps separate cells.
const groupWordsIntoCells = (
  words: readonly TextBlock[],
  maxWordGap: number,
): TextBlock[][] => {
  const cells: TextBlock[][] = [];

  for (const word of words) {
    const cell = cells.at(-1);
    const previous = cell?.at(-1);

    if (
      cell &&
      previous &&
      word.boundingBox!.left - rightEdge(previous) <= maxWordGap
    ) {
      cell.push(word);
    } else {
      cells.push([word]);
    }
  }

  return cells;
};

const splitSpanningLine = (
  line: TextBlock,
  blocks: readonly TextBlock[],
  columns: readonly TableColumnConfig[],
  columnRanges: readonly ColumnRange[],
  xTolerance: number,
): TextBlock[] => {
  if (!spansIntoLaterColumn(line, columns, columnRanges)) {
    return [line];
  }

  const words = findLineWords(line, blocks, xTolerance);

  if (words.length === 0) {
    return [line];
  }

  return groupWordsIntoCells(words, line.boundingBox!.height).map((cell) => {
    const left = cell[0]!.boundingBox!.left;

    return {
      ...line,
      boundingBox: {
        ...line.boundingBox!,
        left,
        width: rightEdge(cell.at(-1)!) - left,
      },
      text: cell.map((word) => word.text!).join(' '),
    };
  });
};

const assignBlocksToColumns = (
  cluster: readonly TextBlock[],
  columnRanges: readonly ColumnRange[],
): TableRow => {
  const row: TableRow = {};

  for (const block of cluster) {
    const matchedColumn =
      columnRanges[findColumnIndex(block.boundingBox!.left, columnRanges)];

    if (matchedColumn) {
      const existing = row[matchedColumn.name];

      row[matchedColumn.name] = existing
        ? `${existing} ${block.text!}`
        : block.text!;
    }
  }

  return row;
};

const appendToRow = (target: TableRow, source: TableRow): void => {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];

    target[key] = existing ? `${existing} ${value}` : value;
  }
};

interface PartialRowWithTop {
  row: TableRow;
  top: number;
}

const mergeRowsByAnchor = (
  partialRows: readonly PartialRowWithTop[],
  anchorColumn: string,
  maxRowGap?: number,
  isNewRowPredicate?: (anchorValue: string) => boolean,
): TableRow[] => {
  const merged: TableRow[] = [];
  let lastAnchorTop: number | undefined;

  for (const { row, top } of partialRows) {
    const anchorValue = row[anchorColumn];
    const hasAnchor =
      anchorValue !== undefined && anchorValue.trim().length > 0;
    const isNewRow = hasAnchor
      ? (isNewRowPredicate?.(anchorValue) ?? true)
      : false;
    const exceedsMaxGap =
      maxRowGap !== undefined &&
      lastAnchorTop !== undefined &&
      top - lastAnchorTop > maxRowGap;

    if (isNewRow) {
      merged.push({ ...row });
      lastAnchorTop = top;
    } else if (merged.length > 0 && !exceedsMaxGap) {
      appendToRow(merged.at(-1)!, row);
    }
  }

  return merged;
};

const matchesHeaderPattern = (
  text: string,
  pattern: RegExp | string,
): boolean => {
  if (typeof pattern === 'string') {
    return text.toLowerCase() === pattern.toLowerCase();
  }

  return pattern.test(text);
};

const findHeaderBlock = (
  blocks: readonly TextBlock[],
  pattern: RegExp | string,
): TextBlock | undefined =>
  blocks.find(
    (block) =>
      block.blockType === 'LINE' &&
      block.text !== undefined &&
      block.boundingBox !== undefined &&
      matchesHeaderPattern(block.text, pattern),
  );

export interface DetectedTableColumns<TColumn extends string = string> {
  columns: Array<TableColumnConfig<TColumn>>;
  headerTop: number;
}

export const detectTableColumns = <TColumn extends string>(
  blocks: readonly TextBlock[],
  headerDefs: readonly [
    HeaderColumnDefinition<TColumn>,
    ...Array<HeaderColumnDefinition<TColumn>>,
  ],
  options?: { yTolerance?: number },
): DetectedTableColumns<TColumn> | undefined => {
  const yTolerance = options?.yTolerance ?? DEFAULT_Y_TOLERANCE;

  const matched: Array<{ block: TextBlock; name: TColumn; optional: boolean }> =
    [];

  for (const definition of headerDefs) {
    const block = findHeaderBlock(blocks, definition.headerPattern);

    if (block) {
      matched.push({
        block,
        name: definition.name,
        optional: definition.optional === true,
      });
    } else if (definition.optional !== true) {
      return undefined;
    }
  }

  const reference = matched.find(({ optional }) => !optional) ?? matched[0];

  if (!reference) {
    return undefined;
  }

  const referenceTop = reference.block.boundingBox!.top;
  const isOnHeaderRow = ({ block }: { block: TextBlock }) =>
    Math.abs(block.boundingBox!.top - referenceTop) <= yTolerance;

  if (matched.some((header) => !header.optional && !isOnHeaderRow(header))) {
    return undefined;
  }

  const columns = matched
    .filter((header) => isOnHeaderRow(header))
    .map(({ block, name }) => ({
      headerLeft: block.boundingBox!.left,
      name,
    }))
    .sort((a, b) => a.headerLeft - b.headerLeft);

  return { columns, headerTop: referenceTop };
};

export const extractTableFromBlocks = <TColumn extends string>(
  blocks: readonly TextBlock[],
  config: TableExtractionConfig<TColumn>,
): { rows: Array<TableRow<TColumn>> } => {
  const yTolerance = config.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const xTolerance = config.xTolerance ?? DEFAULT_X_TOLERANCE;

  const lineBlocks = filterLineBlocks(blocks, config.yRange);
  const columnRanges = buildColumnRanges(config.columns, xTolerance);
  const rowBlocks =
    config.splitSpanningLines === true
      ? lineBlocks.flatMap((line) =>
          splitSpanningLine(
            line,
            blocks,
            config.columns,
            columnRanges,
            xTolerance,
          ),
        )
      : lineBlocks;
  const clusters = clusterBlocksByY(rowBlocks, yTolerance);
  const partialRows = clusters.map((cluster) => ({
    row: assignBlocksToColumns(cluster, columnRanges),
    top: cluster[0]!.boundingBox!.top,
  }));
  const rows = mergeRowsByAnchor(
    partialRows,
    config.anchorColumn,
    config.maxRowGap,
    config.isNewRow,
  ) as Array<TableRow<TColumn>>;

  return { rows };
};
