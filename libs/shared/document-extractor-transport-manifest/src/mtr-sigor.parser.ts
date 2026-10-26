import type {
  HeaderColumnDefinition,
  TableColumnConfig,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  type DocumentParser,
  type EntityWithAddressInfo,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  extractSection,
  parseBrazilianNumber,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';
import {
  detectTableColumns,
  extractTableFromBlocks,
} from '@carrot-fndn/shared/text-extractor';

import {
  createExtractedWasteTypeEntry,
  extractAddressFields,
  extractHaulerFields,
  finalizeMtrExtraction,
  MTR_ADDRESS_PATTERNS,
  MTR_DEFAULT_LABEL_PATTERNS,
  MTR_DEFAULT_PATTERNS,
  stripTrailingRegistrationNumber,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntryData,
} from './transport-manifest.types';

const sectionHeaderPattern = (title: string): RegExp =>
  new RegExp(
    String.raw`^\s*(?:\S*[cç][aã]o[,.]?(?:\s+\S)?\s+)?${title}\s*$`,
    'im',
  );

const SECTION_PATTERNS = {
  generator: sectionHeaderPattern(String.raw`do\s+Gerador`),
  hauler: sectionHeaderPattern(String.raw`do\s+Transportador`),
  receiver: sectionHeaderPattern(String.raw`do\s+Destinador`),
  waste: sectionHeaderPattern(String.raw`dos\s+Residuos`),
} as const;

const MTR_PATTERNS = {
  ...MTR_DEFAULT_PATTERNS,
  // eslint-disable-next-line sonarjs/slow-regex
  companyName: /(?:Raz\S*\s*Social\s*:?|Social\s*:)\s*(.+)/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /CETESB|^Tratam\w*$/im,
  /Manifesto\s*de\s*Transporte/i,
  SECTION_PATTERNS.generator,
  SECTION_PATTERNS.hauler,
  SECTION_PATTERNS.receiver,
  /CPF\/CNPJ/i,
  /Razao\s*Social/i,
  /IBAMA/i,
  /Residuo/i,
];

const LABEL_PATTERNS = {
  ...MTR_DEFAULT_LABEL_PATTERNS,
  driverName: /nome\s*do\s*motorista/i,
} as const;

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

const extractSigorAddressFields = (
  section: string,
  allBlocks: TextExtractionResult['blocks'],
  sectionPattern: RegExp,
): ReturnType<typeof extractAddressFields> => {
  const address = extractAddressFields(section);
  const sectionStart = allBlocks.findIndex(
    (block) =>
      block.blockType === 'LINE' &&
      sectionPattern.test(stripAccents(block.text ?? '')),
  );

  if (sectionStart === -1) {
    return address;
  }

  const remainingBlocks = allBlocks.slice(sectionStart + 1);
  const sectionEnd = remainingBlocks.findIndex(
    (block) =>
      block.blockType === 'LINE' &&
      ALL_SECTION_PATTERNS.some((pattern) =>
        pattern.test(stripAccents(block.text ?? '')),
      ),
  );
  const blocks =
    sectionEnd === -1 ? remainingBlocks : remainingBlocks.slice(0, sectionEnd);
  const addressText = MTR_ADDRESS_PATTERNS.address.exec(section)?.[0];
  const cityText = MTR_ADDRESS_PATTERNS.city.exec(section)?.[0];
  const addressBox = blocks.find(
    (block) =>
      block.blockType === 'LINE' &&
      stripAccents(block.text ?? '') === addressText,
  )?.boundingBox;
  const cityBox = blocks.find(
    (block) =>
      block.blockType === 'LINE' &&
      stripAccents(block.text ?? '') === cityText &&
      block.boundingBox !== undefined &&
      addressBox !== undefined &&
      block.boundingBox.top > addressBox.top,
  )?.boundingBox;

  if (!address || !addressBox || !cityBox) {
    return address;
  }

  const continuation = blocks
    .filter((block) => {
      const box = block.boundingBox;

      return (
        block.blockType === 'LINE' &&
        block.text !== undefined &&
        box !== undefined &&
        Math.abs(box.left - addressBox.left) < 0.02 &&
        box.top + box.height / 2 > addressBox.top + addressBox.height / 2 &&
        box.top + box.height / 2 < cityBox.top + cityBox.height / 2
      );
    })
    .map((block) => stripAccents(block.text!));

  return { ...address, address: [address.address, ...continuation].join(' ') };
};

const extractEntityFromSigorSection = (
  text: string,
  sectionPattern: RegExp,
  blocks: TextExtractionResult['blocks'],
): undefined | { rawMatch: string; value: EntityWithAddressInfo } => {
  const section = extractSection(text, sectionPattern, ALL_SECTION_PATTERNS);

  if (!section) {
    return undefined;
  }

  MTR_PATTERNS.brazilianTaxId.lastIndex = 0;
  const taxIdMatch = MTR_PATTERNS.brazilianTaxId.exec(section);
  const rawTaxId = taxIdMatch?.[1];

  if (!rawTaxId) {
    return undefined;
  }

  const normalizedCnpj = rawTaxId.replaceAll(' ', '').replaceAll(',', '.');

  const companyNameMatch = MTR_PATTERNS.companyName.exec(section);

  if (!companyNameMatch?.[1]) {
    return undefined;
  }

  const name = stripTrailingRegistrationNumber(companyNameMatch[1].trim());

  if (name.length <= 3) {
    return undefined;
  }

  const addressData = extractSigorAddressFields(
    section,
    blocks,
    sectionPattern,
  );

  return {
    rawMatch: section,
    value: {
      name,
      taxId: normalizedCnpj,
      ...addressData,
    },
  };
};

type SigorWasteColumn =
  | 'classification'
  | 'description'
  | 'item'
  | 'packaging'
  | 'physicalState'
  | 'quantity'
  | 'treatment'
  | 'unit';

const ITEM_HEADER = /^Item$/i;
const DESCRIPTION_HEADER = /^C[oó]digo\b.*IBAMA/i;
const UNIT_HEADER = /^Unidade$/i;
const TREATMENT_HEADER = /^Tratamento$/i;

const SIGOR_HEADER_DEFS: [
  HeaderColumnDefinition<SigorWasteColumn>,
  ...Array<HeaderColumnDefinition<SigorWasteColumn>>,
] = [
  { headerPattern: ITEM_HEADER, name: 'item', optional: true },
  { headerPattern: DESCRIPTION_HEADER, name: 'description' },
  { headerPattern: /^Estado\s+F[ií]sico$/i, name: 'physicalState' },
  { headerPattern: /^Classe$/i, name: 'classification' },
  { headerPattern: /^Acondicionamento$/i, name: 'packaging' },
  { headerPattern: /^Qtde$/i, name: 'quantity' },
  { headerPattern: UNIT_HEADER, name: 'unit' },
  { headerPattern: TREATMENT_HEADER, name: 'treatment', optional: true },
];

type BoundingBox = NonNullable<
  TextExtractionResult['blocks'][number]['boundingBox']
>;

const findHeaderBox = (
  blocks: TextExtractionResult['blocks'],
  pattern: RegExp,
): BoundingBox | undefined =>
  blocks.find(
    (block) => block.blockType === 'LINE' && pattern.test(block.text ?? ''),
  )?.boundingBox;

const boxCenter = (box: BoundingBox): { x: number; y: number } => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
});

const QUARTER_TURN_SINE = 0.7;

const alignWasteTableBlocks = (
  blocks: TextExtractionResult['blocks'],
): TextExtractionResult['blocks'] => {
  const first =
    findHeaderBox(blocks, ITEM_HEADER) ??
    findHeaderBox(blocks, DESCRIPTION_HEADER);
  const last =
    findHeaderBox(blocks, TREATMENT_HEADER) ??
    findHeaderBox(blocks, UNIT_HEADER);

  if (!first || !last) {
    return blocks;
  }

  const origin = boxCenter(first);
  const end = boxCenter(last);
  const angle = Math.atan2(end.y - origin.y, end.x - origin.x);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const isQuarterTurn = Math.abs(Math.sin(angle)) > QUARTER_TURN_SINE;

  return blocks.map((block) => {
    const box = block.boundingBox;

    if (!box) {
      return block;
    }

    const center = boxCenter(box);
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const width = isQuarterTurn ? box.height : box.width;

    return {
      ...block,
      boundingBox: {
        height: isQuarterTurn ? box.width : box.height,
        left: origin.x + dx * cos - dy * sin - width / 2,
        top: origin.y + dx * sin + dy * cos,
        width,
      },
    };
  });
};

const WASTE_CODE_PATTERN = /\b(\d{6})(?:\s*\(\*\))?\s*[-–]\s*/;

const RESIDUE_METADATA_PATTERN =
  /(?:\b[A-Z]\d{3}\s*[-–]|Observa[cç][aã]o\s+Res[ií]duo\s*:).*/i;

const stripResidueMetadata = (description: string): string =>
  description.replace(RESIDUE_METADATA_PATTERN, '').trim();

const hasItemNumber = (row: Record<string, string | undefined>): boolean => {
  const itemNumber = Number(row['item']);

  return Number.isInteger(itemNumber) && itemNumber > 0;
};

const WASTE_CODE_ROW_START = /^\d{6}/;

const parseWasteRow = (
  row: Record<string, string | undefined>,
): undefined | WasteTypeEntryData => {
  const rawDescription = row['description'];

  if (!rawDescription) {
    return undefined;
  }

  const description = stripResidueMetadata(rawDescription);
  const codeMatch = WASTE_CODE_PATTERN.exec(description);

  const entry: WasteTypeEntryData = codeMatch?.[1]
    ? {
        code: codeMatch[1],
        description: description.replace(codeMatch[0], '').trim(),
      }
    : { description };

  if (row['classification']) {
    entry.classification = row['classification'];
  }

  if (row['quantity']) {
    const quantity = parseBrazilianNumber(row['quantity']);

    if (quantity !== undefined) {
      entry.quantity = quantity;
    }
  }

  if (row['unit']) {
    entry.unit = row['unit'];
  }

  return entry;
};

export class MtrSigorParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-sigor' as NonEmptyString;
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(
      stripAccents(extractionResult.rawText),
      SIGNATURE_PATTERNS,
    );
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<MtrExtractedData> {
    const { rawText } = extractionResult;
    const text = stripAccents(rawText);
    const matchScore = this.getMatchScore(extractionResult);

    const partialData: Partial<MtrExtractedData> = {
      documentType: 'transportManifest',
      rawText,
    };

    this.extractDocumentNumber(text, partialData);
    this.extractIssueDate(text, partialData);
    this.extractTransportDate(text, partialData);
    this.extractReceivingDate(text, partialData);
    this.extractEntities(text, partialData, extractionResult.blocks);
    extractHaulerFields(text, partialData, {
      allSectionPatterns: ALL_SECTION_PATTERNS,
      labelPatterns: LABEL_PATTERNS,
      sectionPattern: SECTION_PATTERNS.hauler,
    });
    this.extractWasteFields(extractionResult, partialData);

    return finalizeMtrExtraction(partialData, matchScore, rawText);
  }

  private extractDocumentNumber(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const match = MTR_PATTERNS.documentNumber.exec(rawText);

    if (match?.[1]) {
      partialData.documentNumber = createHighConfidenceField(
        match[1],
        match[0],
      );
    }
  }

  private extractEntities(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
    blocks: TextExtractionResult['blocks'],
  ): void {
    const generatorExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.generator,
      blocks,
    );

    partialData.generator =
      createExtractedEntityWithAddress(generatorExtracted);

    const haulerExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.hauler,
      blocks,
    );

    partialData.hauler = createExtractedEntityWithAddress(haulerExtracted);

    const receiverExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.receiver,
      blocks,
    );

    partialData.receiver = createExtractedEntityWithAddress(receiverExtracted);
  }

  private extractIssueDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const issueDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.issueDate,
      LABEL_PATTERNS.issueDate,
    );

    if (issueDate) {
      partialData.issueDate = issueDate;
    }
  }

  private extractReceivingDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const receivingDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.receivingDate,
      LABEL_PATTERNS.receivingDate,
    );

    if (receivingDate) {
      partialData.receivingDate = receivingDate;
    }
  }

  private extractTransportDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const transportDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.transportDate,
      LABEL_PATTERNS.transportDate,
    );

    if (transportDate) {
      partialData.transportDate = transportDate;
    }
  }

  private extractWasteFields(
    extractionResult: TextExtractionResult,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const blocks = alignWasteTableBlocks(extractionResult.blocks);
    const detected = detectTableColumns(blocks, SIGOR_HEADER_DEFS);

    if (!detected) {
      return;
    }

    const tableConfig = {
      columns: detected.columns as [
        TableColumnConfig<SigorWasteColumn>,
        ...Array<TableColumnConfig<SigorWasteColumn>>,
      ],
      maxRowGap: 0.03,
      yRange: { max: Number.POSITIVE_INFINITY, min: detected.headerTop + 0.01 },
    };
    const toEntries = (rows: Array<Record<string, string | undefined>>) =>
      rows
        .map((row) => parseWasteRow(row))
        .filter((entry): entry is WasteTypeEntryData => entry !== undefined);

    let entries = toEntries(
      extractTableFromBlocks(blocks, {
        ...tableConfig,
        anchorColumn: 'item',
      }).rows.filter((row) => hasItemNumber(row)),
    );

    if (entries.length === 0) {
      entries = toEntries(
        extractTableFromBlocks(blocks, {
          ...tableConfig,
          anchorColumn: 'description',
          isNewRow: (value) => WASTE_CODE_ROW_START.test(value),
        }).rows,
      );
    }

    if (entries.length > 0) {
      partialData.wasteTypes = entries.map((entry) =>
        createExtractedWasteTypeEntry(entry),
      );
    }
  }
}

registerParser('transportManifest', 'mtr-sigor', MtrSigorParser);
