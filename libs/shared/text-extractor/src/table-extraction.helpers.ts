import type { TextExtractionResult } from './text-extractor.types';

export interface HeaderColumnDefinition<TColumn extends string = string> {
  headerPattern: RegExp | string;
  name: TColumn;
}

export interface TableColumnConfig<TColumn extends string = string> {
  headerLeft: number;
  name: TColumn;
}

export interface TableExtractionConfig<TColumn extends string = string> {
  anchorColumn: TColumn;
  columns: [TableColumnConfig<TColumn>, ...Array<TableColumnConfig<TColumn>>];
  maxRowGap?: number;
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
    const nextColumn = columns[index + 1];

    return {
      max: nextColumn ? nextColumn.headerLeft - xTolerance : 1,
      min: column.headerLeft - xTolerance,
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
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      currentCluster = [block];
    }

    lastTop = top;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
};

const assignBlocksToColumns = (
  cluster: readonly TextBlock[],
  columnRanges: readonly ColumnRange[],
): TableRow => {
  const row: TableRow = {};

  for (const block of cluster) {
    const left = block.boundingBox!.left;
    const matchedColumn = columnRanges.find(
      (range) => left >= range.min && left < range.max,
    );

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
): TableRow[] => {
  const merged: TableRow[] = [];
  let lastAnchorTop: number | undefined;

  for (const { row, top } of partialRows) {
    const anchorValue = row[anchorColumn];
    const isNewRow = anchorValue !== undefined && anchorValue.trim().length > 0;
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

  const matched: Array<{ block: TextBlock; name: TColumn }> = [];

  for (const definition of headerDefs) {
    const block = findHeaderBlock(blocks, definition.headerPattern);

    if (!block) {
      return undefined;
    }

    matched.push({ block, name: definition.name });
  }

  const referenceTop = matched[0]!.block.boundingBox!.top;
  const allOnSameRow = matched.every(
    ({ block }) =>
      Math.abs(block.boundingBox!.top - referenceTop) <= yTolerance,
  );

  if (!allOnSameRow) {
    return undefined;
  }

  const columns = matched
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
  const clusters = clusterBlocksByY(lineBlocks, yTolerance);
  const partialRows = clusters.map((cluster) => ({
    row: assignBlocksToColumns(cluster, columnRanges),
    top: cluster[0]!.boundingBox!.top,
  }));
  const rows = mergeRowsByAnchor(
    partialRows,
    config.anchorColumn,
    config.maxRowGap,
  ) as Array<TableRow<TColumn>>;

  return { rows };
};
