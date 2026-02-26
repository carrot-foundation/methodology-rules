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
  MTR_DEFAULT_LABEL_PATTERNS,
  MTR_DEFAULT_PATTERNS,
  stripTrailingRegistrationNumber,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntryData,
} from './transport-manifest.types';

const SECTION_PATTERNS = {
  destinador: /^\s*Identificacao\s+do\s+Destinador\s*$/i,
  gerador: /^\s*Identificacao\s+do\s+Gerador\s*$/i,
  residuos: /^\s*Identificacao\s+dos\s+Residuos\s*$/i,
  transportador: /^\s*Identificacao\s+do\s+Transportador\s*$/i,
} as const;

const MTR_PATTERNS = {
  ...MTR_DEFAULT_PATTERNS,
  // eslint-disable-next-line sonarjs/slow-regex
  razaoSocial: /Razao\s*Social\s*:?\s*(.+)/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /CETESB/i,
  /Manifesto\s*de\s*Transporte/i,
  /Identificacao\s+do\s+Gerador/i,
  /Identificacao\s+do\s+Transportador/i,
  /Identificacao\s+do\s+Destinador/i,
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

const extractEntityFromSigorSection = (
  text: string,
  sectionPattern: RegExp,
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

  const normalizedCnpj = rawTaxId.replaceAll(' ', '');

  const razaoMatch = MTR_PATTERNS.razaoSocial.exec(section);

  if (!razaoMatch?.[1]) {
    return undefined;
  }

  const name = stripTrailingRegistrationNumber(razaoMatch[1].trim());

  if (name.length <= 3) {
    return undefined;
  }

  const addressData = extractAddressFields(section);

  return {
    rawMatch: section,
    value: {
      name: name as NonEmptyString,
      taxId: normalizedCnpj as NonEmptyString,
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

const SIGOR_HEADER_DEFS: [
  HeaderColumnDefinition<SigorWasteColumn>,
  ...Array<HeaderColumnDefinition<SigorWasteColumn>>,
] = [
  { headerPattern: /^Item$/i, name: 'item' },
  { headerPattern: /^C[oó]digo\s+IBAMA/i, name: 'description' },
  { headerPattern: /^Estado\s+F[ií]sico$/i, name: 'physicalState' },
  { headerPattern: /^Classe$/i, name: 'classification' },
  { headerPattern: /^Acondicionamento$/i, name: 'packaging' },
  { headerPattern: /^Qtde$/i, name: 'quantity' },
  { headerPattern: /^Unidade$/i, name: 'unit' },
  { headerPattern: /^Tratamento$/i, name: 'treatment' },
];

const SIGOR_ANCHOR_COLUMN: SigorWasteColumn = 'item';

const WASTE_CODE_PATTERN = /^(\d{6})\s*[-–]\s*(.+)/;

const parseWasteRow = (
  row: Record<string, string | undefined>,
): undefined | WasteTypeEntryData => {
  const itemNumber = Number(row['item']);

  if (!Number.isInteger(itemNumber) || itemNumber <= 0) {
    return undefined;
  }

  const rawDescription = row['description'];

  if (!rawDescription) {
    return undefined;
  }

  const codeMatch = WASTE_CODE_PATTERN.exec(rawDescription);

  const entry: WasteTypeEntryData = codeMatch?.[1]
    ? {
        code: codeMatch[1],
        // codeMatch[2] is always defined when codeMatch[1] matches (.+ requires at least one char)

        description: codeMatch[2]!.trim(),
      }
    : { description: rawDescription.trim() };

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
    this.extractEntities(text, partialData);
    extractHaulerFields(text, partialData, {
      allSectionPatterns: ALL_SECTION_PATTERNS,
      labelPatterns: LABEL_PATTERNS,
      sectionPattern: SECTION_PATTERNS.transportador,
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
        match[1] as NonEmptyString,
        match[0],
      );
    }
  }

  private extractEntities(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const generatorExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.gerador,
    );

    partialData.generator =
      createExtractedEntityWithAddress(generatorExtracted);

    const haulerExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.transportador,
    );

    partialData.hauler = createExtractedEntityWithAddress(haulerExtracted);

    const receiverExtracted = extractEntityFromSigorSection(
      rawText,
      SECTION_PATTERNS.destinador,
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
    const detected = detectTableColumns(
      extractionResult.blocks,
      SIGOR_HEADER_DEFS,
    );

    if (!detected) {
      return;
    }

    const { rows } = extractTableFromBlocks(extractionResult.blocks, {
      anchorColumn: SIGOR_ANCHOR_COLUMN,
      columns: detected.columns as [
        TableColumnConfig<SigorWasteColumn>,
        ...Array<TableColumnConfig<SigorWasteColumn>>,
      ],
      maxRowGap: 0.03,
      yRange: { max: 1, min: detected.headerTop + 0.01 },
    });

    const entries = rows
      .map((row) => parseWasteRow(row))
      .filter((entry): entry is WasteTypeEntryData => entry !== undefined);

    if (entries.length > 0) {
      partialData.wasteTypes = entries.map((entry) =>
        createExtractedWasteTypeEntry(entry),
      );
    }
  }
}

registerParser('transportManifest', 'mtr-sigor', MtrSigorParser);
