import type {
  HeaderColumnDefinition,
  TableColumnConfig,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  extractSection,
  extractStringField,
  parseBrazilianNumber,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';
import {
  detectTableColumns,
  extractTableFromBlocks,
} from '@carrot-fndn/shared/text-extractor';

import {
  extractDriverAndVehicle,
  extractMtrEntityWithAddress,
  finalizeMtrExtraction,
  MTR_DEFAULT_LABEL_PATTERNS,
  MTR_DEFAULT_PATTERNS,
  MTR_DEFAULT_SECTION_PATTERNS,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntry,
} from './transport-manifest.types';

const MTR_PATTERNS = {
  ...MTR_DEFAULT_PATTERNS,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:n[°º])?\s*(\d{10})\b/i,
} as const;
const LABEL_PATTERNS = { ...MTR_DEFAULT_LABEL_PATTERNS } as const;
const SECTION_PATTERNS = { ...MTR_DEFAULT_SECTION_PATTERNS } as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /Manifesto\s*de\s*Transporte\s*de\s*Residuos/i,
  /Fundacao\s+Estadual|Secretaria\s+de\s+Estado/i,
  /Gerador/i,
  /Transportador/i,
  /Destinatario|Destinador/i,
  /Tecnologia/i,
  /Residuo/i,
];

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

type SinfatWasteColumn =
  | 'classification'
  | 'description'
  | 'packaging'
  | 'physicalState'
  | 'quantity'
  | 'technology'
  | 'unit';

const SINFAT_HEADER_DEFS: [
  HeaderColumnDefinition<SinfatWasteColumn>,
  ...Array<HeaderColumnDefinition<SinfatWasteColumn>>,
] = [
  { headerPattern: /^Item.*IBAMA/i, name: 'description' },
  { headerPattern: /^Estado\s+F[ií]sico$/i, name: 'physicalState' },
  { headerPattern: /^Classe$/i, name: 'classification' },
  { headerPattern: /^Acondicionamento$/i, name: 'packaging' },
  { headerPattern: /^Qtde$/i, name: 'quantity' },
  { headerPattern: /^Unidade$/i, name: 'unit' },
  { headerPattern: /^Tecnologia$/i, name: 'technology' },
];

const SINFAT_ANCHOR_COLUMN: SinfatWasteColumn = 'description';

const SINFAT_WASTE_CODE_PATTERN = /^\d+\.\s+(\d{6})\s+(.+)/;

// eslint-disable-next-line sonarjs/slow-regex
const SINFAT_WASTE_ITEM_PATTERN = /\d+\.\s+(\d{6})\s+(.+)/g;

const parseSinfatWasteRow = (
  rawDescription: string,
  row: Record<string, string | undefined>,
): WasteTypeEntry => {
  const codeMatch = SINFAT_WASTE_CODE_PATTERN.exec(rawDescription)!;

  const entry: WasteTypeEntry = {
    code: codeMatch[1] as string,
    description: (codeMatch[2] as string).trim(),
  };

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

export class MtrSinfatParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-sinfat';
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

    const documentNumberExtracted = extractStringField(
      text,
      MTR_PATTERNS.documentNumber,
    );

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    const issueDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.issueDate,
      LABEL_PATTERNS.issueDate,
    );

    if (issueDate) {
      partialData.issueDate = issueDate;
    }

    const transportDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.transportDate,
      LABEL_PATTERNS.transportDate,
    );

    if (transportDate) {
      partialData.transportDate = transportDate;
    }

    const receivingDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.receivingDate,
      LABEL_PATTERNS.receivingDate,
    );

    if (receivingDate) {
      partialData.receivingDate = receivingDate;
    }

    partialData.generator = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.gerador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    partialData.hauler = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    partialData.receiver = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.destinatario,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    this.extractHaulerFields(text, partialData);
    this.extractWasteFields(extractionResult, text, partialData);

    return finalizeMtrExtraction(partialData, matchScore, rawText);
  }

  private extractHaulerFields(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const haulerSection = extractSection(
      rawText,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
    );

    if (haulerSection) {
      const { driverName, vehiclePlate } =
        extractDriverAndVehicle(haulerSection);

      if (driverName) {
        partialData.driverName = createHighConfidenceField(
          driverName as NonEmptyString,
          `Nome do Motorista\n${driverName}`,
        );
      } else if (LABEL_PATTERNS.driverName.test(rawText)) {
        partialData.driverName = createLowConfidenceField('' as NonEmptyString);
      }

      if (vehiclePlate) {
        partialData.vehiclePlate = createHighConfidenceField(
          vehiclePlate as NonEmptyString,
          `Placa do Veiculo\n${vehiclePlate}`,
        );
      } else if (LABEL_PATTERNS.vehiclePlate.test(rawText)) {
        partialData.vehiclePlate = createLowConfidenceField(
          '' as NonEmptyString,
        );
      }

      return;
    }

    if (LABEL_PATTERNS.driverName.test(rawText)) {
      partialData.driverName = createLowConfidenceField('' as NonEmptyString);
    }

    if (LABEL_PATTERNS.vehiclePlate.test(rawText)) {
      partialData.vehiclePlate = createLowConfidenceField('' as NonEmptyString);
    }
  }

  private extractWasteFields(
    extractionResult: TextExtractionResult,
    text: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const detected = detectTableColumns(
      extractionResult.blocks,
      SINFAT_HEADER_DEFS,
    );

    if (detected) {
      this.extractWasteFromTable(extractionResult, detected, partialData);

      return;
    }

    this.extractWasteFromText(text, partialData);
  }

  private extractWasteFromTable(
    extractionResult: TextExtractionResult,
    detected: {
      columns: Array<TableColumnConfig<SinfatWasteColumn>>;
      headerTop: number;
    },
    partialData: Partial<MtrExtractedData>,
  ): void {
    const { rows } = extractTableFromBlocks(extractionResult.blocks, {
      anchorColumn: SINFAT_ANCHOR_COLUMN,
      columns: detected.columns as [
        TableColumnConfig<SinfatWasteColumn>,
        ...Array<TableColumnConfig<SinfatWasteColumn>>,
      ],
      maxRowGap: 0.03,
      yRange: { max: 1, min: detected.headerTop + 0.01 },
    });

    const rowsWithDescription = rows.filter(
      (row): row is typeof row & { description: string } =>
        row.description !== undefined &&
        SINFAT_WASTE_CODE_PATTERN.test(row.description),
    );

    const entries = rowsWithDescription.map((row) =>
      parseSinfatWasteRow(row.description, row),
    );

    if (entries.length > 0) {
      partialData.wasteTypes = createHighConfidenceField(
        entries,
        rowsWithDescription.map((row) => row.description).join('\n'),
      );
    }
  }

  private extractWasteFromText(
    text: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const entries: WasteTypeEntry[] = [];
    const rawMatches: string[] = [];

    for (const match of text.matchAll(SINFAT_WASTE_ITEM_PATTERN)) {
      entries.push({
        code: match[1]!,
        description: match[2]!.trim(),
      });
      rawMatches.push(match[0]);
    }

    if (entries.length > 0) {
      partialData.wasteTypes = createHighConfidenceField(
        entries,
        rawMatches.join('\n'),
      );
    }
  }
}

registerParser('transportManifest', 'mtr-sinfat', MtrSinfatParser);
