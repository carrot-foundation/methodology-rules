# CDF Custom-1 Block-Based Table Extraction

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken regex-based receipt table extraction in `cdf-custom-1` with positional block-based extraction so that `processingPeriod` (and `receiptEntries`) are correctly populated from real Textract output, including multi-page PDFs.

**Architecture:** Add `normalizeMultiPageBlocks` to `@carrot-fndn/shared/text-extractor` to fix multi-page coordinate normalization. Move custom-1-only helpers out of `cdf-shared.helpers` into the parser file (DRY — they were never shared). Refactor `CdfCustom1Parser.extractTableData` to use `normalizeMultiPageBlocks` + `detectTableColumns` + `extractTableFromBlocks`, with a regex fallback when headers are not detected.

**Tech Stack:** TypeScript, Jest, `@carrot-fndn/shared/text-extractor` (`extractTableFromBlocks`, `detectTableColumns`)

---

### Task 1: Add `normalizeMultiPageBlocks` to `@carrot-fndn/shared/text-extractor`

**Background:** When a multi-page PDF is processed by Textract via page-splitting, blocks from each page have `top` coordinates that restart at 0. `extractTableFromBlocks` sorts blocks by `top`, so page 2 blocks (top ~0.018) would incorrectly sort before page 1 blocks (top ~0.539). The fix: detect page breaks (where `top` drops by more than a threshold from the previous block) and add `pageIndex * 1.0` to subsequent pages' `top` values, creating a continuous coordinate space.

**Files:**

- Create: `libs/shared/text-extractor/src/multi-page.helpers.ts`
- Create: `libs/shared/text-extractor/src/multi-page.helpers.spec.ts`
- Modify: `libs/shared/text-extractor/src/index.ts`

**Step 1: Write the failing tests**

Create `libs/shared/text-extractor/src/multi-page.helpers.spec.ts`:

```typescript
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
    const blocks: TextBlock[] = [makeBlock(0.1), makeBlock(0.3), makeBlock(0.8)];

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
    const blocks: TextBlock[] = [{ blockType: 'LINE', id: 'no-bb', text: 'hello' }, makeBlock(0.1)];

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
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm nx test shared-text-extractor --testPathPattern=multi-page.helpers.spec
```

Expected: FAIL — `Cannot find module './multi-page.helpers'`

**Step 3: Implement `normalizeMultiPageBlocks`**

Create `libs/shared/text-extractor/src/multi-page.helpers.ts`:

```typescript
import type { TextExtractionResult } from './text-extractor.types';

type TextBlock = TextExtractionResult['blocks'][number];

const DEFAULT_PAGE_BREAK_THRESHOLD = 0.5;

export const normalizeMultiPageBlocks = (blocks: readonly TextBlock[], pageBreakThreshold = DEFAULT_PAGE_BREAK_THRESHOLD): TextBlock[] => {
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
```

**Step 4: Export from `index.ts`**

Add to `libs/shared/text-extractor/src/index.ts`:

```typescript
export * from './multi-page.helpers';
```

**Step 5: Run tests to verify they pass**

```bash
pnpm nx test shared-text-extractor --testPathPattern=multi-page.helpers.spec
```

Expected: ALL PASS

**Step 6: Run full test suite + lint + typecheck**

```bash
pnpm nx test shared-text-extractor && pnpm nx lint shared-text-extractor --fix && pnpm nx ts shared-text-extractor
```

Expected: ALL PASS

**Step 7: Commit**

```bash
git add libs/shared/text-extractor/src/multi-page.helpers.ts libs/shared/text-extractor/src/multi-page.helpers.spec.ts libs/shared/text-extractor/src/index.ts
git commit -m "feat(shared): add normalizeMultiPageBlocks helper for multi-page Textract PDFs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Move custom-1-only code out of `cdf-shared.helpers`

**Background:** `cdf-shared.helpers.ts` exports helpers used only by `cdf-custom-1` — `parseReceiptTableRows`, `toReceiptEntries`, `extractCadriNumbers`, `buildWasteEntriesFromSubtotals`, `extractWasteSubtotals`, `extractWasteTypeDescriptions`, `derivePeriodFromReceiptDates`, `parseDdMmYyyy`, and their interfaces. The other parsers (sinfat, sinir) never use them. Moving them to the parser file respects DRY.

**Files:**

- Modify: `libs/shared/document-extractor-recycling-manifest/src/cdf-shared.helpers.ts`
- Modify: `libs/shared/document-extractor-recycling-manifest/src/cdf-shared.helpers.spec.ts`
- Modify: `libs/shared/document-extractor-recycling-manifest/src/cdf-custom-1.parser.ts`

**Step 1: Run the full test suite to establish baseline**

```bash
pnpm nx test shared-document-extractor-recycling-manifest
```

Expected: ALL PASS (98 tests)

**Step 2: Move helpers to `cdf-custom-1.parser.ts`**

In `cdf-custom-1.parser.ts`, remove all imports of the to-be-moved symbols from `./cdf-shared.helpers`, then add these as local (non-exported) helpers before the class definition. Move verbatim (no changes to logic):

**Interfaces to add locally:**

```typescript
interface ReceiptTableRow {
  cadri?: string;
  quantity: number;
  receiptDate: string;
  wasteType: string;
}

interface WasteSubtotal {
  quantity: number;
  wasteType: string;
}

interface WasteTypeDescription {
  description: string;
  wasteType: string;
}
```

**Functions to add locally** (copy verbatim from `cdf-shared.helpers.ts`):

- `parseDdMmYyyy` (private, unchanged)
- `derivePeriodFromReceiptDates` (unchanged)
- `parseReceiptTableRows` (unchanged — will become the fallback)
- `toReceiptEntries` (unchanged)
- `extractCadriNumbers` (unchanged)
- `extractWasteTypeDescriptions` (unchanged)
- `extractWasteSubtotals` (unchanged)
- `buildWasteEntriesFromSubtotals` (unchanged)

**Step 3: Remove moved symbols from `cdf-shared.helpers.ts`**

Delete from `libs/shared/document-extractor-recycling-manifest/src/cdf-shared.helpers.ts`:

- `ReceiptTableRow` interface (lines ~148–153)
- `WasteSubtotal` interface (lines ~155–158)
- `WasteTypeDescription` interface (lines ~160–163)
- `parseReceiptTableRows` function
- `extractWasteTypeDescriptions` function
- `extractWasteSubtotals` function
- `buildWasteEntriesFromSubtotals` function
- `extractCadriNumbers` function
- `toReceiptEntries` function
- `derivePeriodFromReceiptDates` function
- `parseDdMmYyyy` function

**Step 4: Remove corresponding tests from `cdf-shared.helpers.spec.ts`**

Delete the following `describe` blocks from `cdf-shared.helpers.spec.ts`:

- `describe('parseReceiptTableRows', ...)`
- `describe('extractWasteTypeDescriptions', ...)`
- `describe('extractWasteSubtotals', ...)`
- `describe('buildWasteEntriesFromSubtotals', ...)`
- `describe('extractCadriNumbers', ...)`
- `describe('derivePeriodFromReceiptDates', ...)`

Also remove their imports from the top of the spec file.

**Step 5: Run tests to verify all pass**

```bash
pnpm nx test shared-document-extractor-recycling-manifest
```

Expected: ALL PASS (fewer tests in shared helpers spec, same in parser spec)

**Step 6: Run lint + typecheck**

```bash
pnpm nx lint shared-document-extractor-recycling-manifest --fix && pnpm nx ts shared-document-extractor-recycling-manifest
```

Expected: ALL PASS

**Step 7: Commit**

```bash
git add libs/shared/document-extractor-recycling-manifest/src/
git commit -m "refactor(shared): move cdf-custom-1-only helpers into parser file

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Refactor `CdfCustom1Parser` to use block-based table extraction

**Background:** Real Textract output for the CDF custom layout puts each table cell on its own line. The previous regex (`parseReceiptTableRows`) expected all fields on one line and never matched. The fix uses `normalizeMultiPageBlocks` → `detectTableColumns` → `extractTableFromBlocks` to correctly extract receipt rows using block positions. A regex fallback is retained for robustness (same pattern as `mtr-sinfat`).

**Column layout (from real Textract output):**

- `Tipo de Matéria-Prima` at left ≈ 0.071 → column `wasteType` (anchor)
- `CADRI` at left ≈ 0.270 → column `cadri`
- `Data de recebimento da` at left ≈ 0.331 → column `receiptDate`
- `Quantidade Recebida (ton)` at left ≈ 0.625 → column `quantity`

**Files:**

- Modify: `libs/shared/document-extractor-recycling-manifest/src/cdf-custom-1.parser.ts`
- Modify: `libs/shared/document-extractor-recycling-manifest/src/cdf-custom-1.parser.spec.ts`

**Step 1: Write the new failing tests**

Add these tests to `cdf-custom-1.parser.spec.ts` inside `describe('parse', ...)`. Use the `makeBlock` helper pattern from `table-extraction.helpers.spec.ts`:

```typescript
import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';

// Add near the top of the describe block:
type TextBlock = TextExtractionResult['blocks'][number];

const makeBlock = (text: string, left: number, top: number): TextBlock => ({
  blockType: 'LINE',
  boundingBox: { height: 0.015, left, top, width: 0.2 },
  id: `${text}-${top}`,
  text,
});

// Table header blocks (from real Textract - note Data header is slightly higher)
const CDF_TABLE_HEADER_BLOCKS: TextBlock[] = [makeBlock('Data de recebimento da', 0.331, 0.508), makeBlock('Tipo de Matéria-Prima', 0.071, 0.515), makeBlock('CADRI', 0.27, 0.515), makeBlock('Quantidade Recebida (ton)', 0.625, 0.515)];

// Helper to build a receipt row (3 blocks per row)
const makeReceiptRow = (wasteType: string, date: string, quantity: string, top: number, cadri?: string): TextBlock[] => [makeBlock(wasteType, 0.066, top), ...(cadri ? [makeBlock(cadri, 0.27, top + 0.001)] : []), makeBlock(date, 0.388, top + 0.001), makeBlock(quantity, 0.716, top + 0.001)];

// Preamble blocks (generator, recycler, etc.) needed for parser to extract other fields
const CDF_PREAMBLE_BLOCKS: TextBlock[] = [makeBlock('CDF 50193/24', 0.06, 0.05), makeBlock('Jundiaí, 07 de Agosto de 2024.', 0.06, 0.1), makeBlock('Empresa Recebedora: Tera Ambiental Ltda.', 0.06, 0.2), makeBlock('CNPJ: 59.591.115/0003-02 IE: 407.275.597.112', 0.06, 0.22), makeBlock('Empresa Geradora: AJINOMOTO DO BRASIL', 0.06, 0.3), makeBlock('CNPJ: 46.344.354/0005-88 IE: 417325212115', 0.06, 0.32)];

it('should extract receipt entries from block-based table', () => {
  const blocks: TextBlock[] = [...CDF_PREAMBLE_BLOCKS, ...CDF_TABLE_HEADER_BLOCKS, ...makeReceiptRow('LODO SOLIDO - SANITARIO', '01/07/2024', '85,12', 0.539), ...makeReceiptRow('LODO SOLIDO - SANITARIO', '02/07/2024', '90,50', 0.556), ...makeReceiptRow('LODO SOLIDO - SANITARIO', '15/07/2024', '201,97', 0.575), makeBlock('Quantidade Tratada de LODO SOLIDO - SANITARIO 377,59', 0.09, 0.6), makeBlock('Quantidade Total Tratado', 0.19, 0.62), makeBlock('377,59', 0.19, 0.635)];

  const result = parser.parse({
    blocks,
    rawText: validCustomCdfText as never,
  });

  expect(result.data.receiptEntries?.parsed).toHaveLength(3);
  expect(result.data.receiptEntries?.confidence).toBe('high');
  expect(result.data.receiptEntries?.parsed[0]).toEqual({
    quantity: 85.12,
    receiptDate: '01/07/2024',
    wasteType: 'LODO SOLIDO - SANITARIO',
  });
  expect(result.data.processingPeriod?.parsed).toBe('01/07/2024 ate 15/07/2024');
  expect(result.data.processingPeriod?.confidence).toBe('high');
});

it('should extract receipt entries from multi-page block-based table', () => {
  // Page 1: rows with top 0.539–0.868; page 2: rows with top 0.018–0.036 (reset)
  const blocks: TextBlock[] = [
    ...CDF_PREAMBLE_BLOCKS,
    ...CDF_TABLE_HEADER_BLOCKS,
    // Page 1 rows
    ...makeReceiptRow('LODO SOLIDO - SANITARIO', '01/12/2024', '91,46', 0.539),
    ...makeReceiptRow('LODO SOLIDO - SANITARIO', '18/12/2024', '98,59', 0.85),
    // Page break marker (footer at bottom of page 1)
    makeBlock('Tera Ambiental Ltda', 0.435, 0.92),
    // Page 2 rows (top resets)
    ...makeReceiptRow('LODO SOLIDO - SANITARIO', '20/12/2024', '80,11', 0.018),
    ...makeReceiptRow('LODO SOLIDO - SANITARIO', '31/12/2024', '79,79', 0.036),
    makeBlock('Quantidade Tratada de LODO SOLIDO - SANITARIO 350,00', 0.09, 0.22),
    makeBlock('Quantidade Total Tratado', 0.19, 0.24),
    makeBlock('350,00', 0.19, 0.255),
  ];

  const result = parser.parse({
    blocks,
    rawText: validCustomCdfText as never,
  });

  expect(result.data.receiptEntries?.parsed).toHaveLength(4);
  expect(result.data.processingPeriod?.parsed).toBe('01/12/2024 ate 31/12/2024');
});

it('should extract CADRI numbers when present in blocks', () => {
  const blocks: TextBlock[] = [...CDF_PREAMBLE_BLOCKS, ...CDF_TABLE_HEADER_BLOCKS, ...makeReceiptRow('LODO SOLIDO - SANITARIO', '01/07/2024', '85,12', 0.539, '42003189'), ...makeReceiptRow('LODO SOLIDO - SANITARIO', '02/07/2024', '90,50', 0.556, '42003189'), makeBlock('Quantidade Total Tratado', 0.19, 0.62), makeBlock('175,62', 0.19, 0.635)];

  const result = parser.parse({
    blocks,
    rawText: validCustomCdfText as never,
  });

  expect(result.data.transportManifests?.parsed).toEqual(['42003189']);
  expect(result.data.receiptEntries?.parsed[0]?.cadri).toBe('42003189');
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm nx test shared-document-extractor-recycling-manifest --testPathPattern=cdf-custom-1.parser.spec
```

Expected: FAIL — receipt entries are empty when blocks are provided (still using old regex path)

**Step 3: Implement block-based table extraction in the parser**

In `cdf-custom-1.parser.ts`:

**Add imports:**

```typescript
import type { HeaderColumnDefinition, TableColumnConfig, TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import { detectTableColumns, extractTableFromBlocks, normalizeMultiPageBlocks } from '@carrot-fndn/shared/text-extractor';
```

**Add column type and header defs** (before the class):

```typescript
type CdfTableColumn = 'cadri' | 'quantity' | 'receiptDate' | 'wasteType';

const CDF_TABLE_HEADER_DEFS: [HeaderColumnDefinition<CdfTableColumn>, ...Array<HeaderColumnDefinition<CdfTableColumn>>] = [
  { headerPattern: /Data\s+de\s+recebimento/i, name: 'receiptDate' },
  { headerPattern: /Tipo\s+de\s+Mat[eé]ria-Prima/i, name: 'wasteType' },
  { headerPattern: /CADRI/i, name: 'cadri' },
  { headerPattern: /Quantidade\s+Recebida/i, name: 'quantity' },
];

const CDF_TABLE_ANCHOR: CdfTableColumn = 'wasteType';
```

**Add `parseCdfTableRow` local helper** (before the class):

```typescript
import type { TableRow } from '@carrot-fndn/shared/text-extractor';
// (TableRow is exported from table-extraction.helpers.ts — add to imports)

const parseCdfTableRow = (row: TableRow<CdfTableColumn>): ReceiptTableRow | undefined => {
  const wasteType = row.wasteType?.trim();
  const receiptDate = row.receiptDate?.trim();
  const quantityStr = row.quantity?.trim();

  if (!wasteType || !receiptDate || !quantityStr) {
    return undefined;
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(receiptDate)) {
    return undefined;
  }

  const quantity = parseBrazilianNumber(quantityStr);

  if (quantity === undefined) {
    return undefined;
  }

  const tableRow: ReceiptTableRow = {
    quantity,
    receiptDate,
    wasteType: stripAccents(wasteType),
  };

  const cadri = row.cadri?.trim();

  if (cadri && /^\d{5,}$/.test(cadri)) {
    tableRow.cadri = cadri;
  }

  return tableRow;
};
```

**Change `parse` method signature** to pass `extractionResult` to `extractTableData`:

In the `parse` method, change:

```typescript
// OLD:
this.extractTableData(text, partialData);

// NEW:
this.extractTableData(extractionResult, partialData);
```

**Rewrite `extractTableData`** method:

```typescript
private extractTableData(
  extractionResult: TextExtractionResult,
  partialData: Partial<CdfExtractedData>,
): void {
  const rows = this.extractReceiptRows(extractionResult);

  if (rows.length > 0) {
    partialData.receiptEntries = createHighConfidenceField(
      toReceiptEntries(rows),
      `${String(rows.length)} receipt table rows`,
    );

    const cadriNumbers = extractCadriNumbers(rows);

    if (cadriNumbers.length > 0) {
      partialData.transportManifests = createHighConfidenceField(
        cadriNumbers,
        cadriNumbers.join(', '),
      );
    }

    const period = derivePeriodFromReceiptDates(rows);

    if (period) {
      partialData.processingPeriod = createHighConfidenceField(
        period as NonEmptyString,
        period,
      );
    }
  }

  const text = stripAccents(extractionResult.rawText);
  const subtotals = extractWasteSubtotals(text);

  if (subtotals.length > 0) {
    const descriptions = extractWasteTypeDescriptions(text);
    const wasteEntries = buildWasteEntriesFromSubtotals(subtotals, descriptions);

    partialData.wasteEntries = createHighConfidenceField(
      wasteEntries,
      subtotals.map((s) => `${s.wasteType}: ${String(s.quantity)}`).join('; '),
    );

    return;
  }

  this.extractWasteQuantityFallback(text, partialData);
}

private extractReceiptRows(
  extractionResult: TextExtractionResult,
): ReceiptTableRow[] {
  const normalized = normalizeMultiPageBlocks(extractionResult.blocks);
  const detected = detectTableColumns(normalized, CDF_TABLE_HEADER_DEFS);

  if (detected) {
    const { rows } = extractTableFromBlocks(normalized, {
      anchorColumn: CDF_TABLE_ANCHOR,
      columns: detected.columns as [
        TableColumnConfig<CdfTableColumn>,
        ...Array<TableColumnConfig<CdfTableColumn>>,
      ],
      maxRowGap: 0.03,
      yRange: { max: 999, min: detected.headerTop + 0.01 },
    });

    const parsed = rows
      .map((row) => parseCdfTableRow(row))
      .filter((r): r is ReceiptTableRow => r !== undefined);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  // Fallback: regex on raw text (for cases where block detection fails)
  return parseReceiptTableRows(stripAccents(extractionResult.rawText));
}
```

Also update `extractWasteQuantityFallback` to accept `text: string` (it already does).

**Step 4: Run tests to verify they pass**

```bash
pnpm nx test shared-document-extractor-recycling-manifest --testPathPattern=cdf-custom-1.parser.spec
```

Expected: ALL PASS

**Step 5: Run full test suite + lint + typecheck**

```bash
pnpm nx test shared-document-extractor-recycling-manifest && pnpm nx lint shared-document-extractor-recycling-manifest --fix && pnpm nx ts shared-document-extractor-recycling-manifest
```

Expected: ALL PASS

**Step 6: Commit**

```bash
git add libs/shared/document-extractor-recycling-manifest/src/
git commit -m "feat(shared): use block-based table extraction in cdf-custom-1 parser

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Verify against real cached Textract data

**Background:** Run the rule locally against the previously failing PDFs to confirm the period is now extracted correctly.

**Files:** None (read-only verification)

**Step 1: Run the rule against the stock-audited-masses report**

```bash
aws-vault exec smaug-prod -- pnpm run-rule run \
  libs/methodologies/bold/rule-processors/mass-id/document-manifest-data \
  --config '{"documentManifestType":"Recycling Manifest"}' \
  --input-file ~/Downloads/reports.stock-audited-masses-detailed.json
```

**Step 2: Check the output log**

```bash
ls -t tools/rule-runner-cli/logs/*.json | head -1 | xargs python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
sample = next((r for r in data if 'cdf-custom-1' in str(r)), None)
if sample:
    pp = sample['resultContent']['crossValidation']['processingPeriod']
    print('processingPeriod:', pp)
    print('status:', sample['resultStatus'])
"
```

Expected: `processingPeriod.extracted` is no longer `null` for `cdf-custom-1` documents with receipt table data.

**Step 3: Commit if no code changes were needed**

If the verification passes without code changes, no commit needed. If issues are found, fix and commit with:

```bash
git commit -m "fix(shared): correct block-based extraction for cdf-custom-1 edge cases

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
