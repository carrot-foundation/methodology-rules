import type {
  HeaderColumnDefinition,
  TableColumnConfig,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  type DocumentParser,
  entityFieldOrEmpty,
  type EntityInfo,
  type ExtractionOutput,
  extractSection,
  finalizeExtraction,
  parseBrazilianNumber,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';
import {
  detectTableColumns,
  extractTableFromBlocks,
} from '@carrot-fndn/shared/text-extractor';

import {
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
  type WasteTypeEntry,
} from './transport-manifest.types';

const SECTION_PATTERNS = {
  destinador: /^\s*Identifica[çc][ãa]o\s+do\s+Destinador\s*$/i,
  gerador: /^\s*Identifica[çc][ãa]o\s+do\s+Gerador\s*$/i,
  residuos: /^\s*Identifica[çc][ãa]o\s+dos\s+Res[ií]duos\s*$/i,
  transportador: /^\s*Identifica[çc][ãa]o\s+do\s+Transportador\s*$/i,
} as const;

const MTR_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CPF\/CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  issueDate: /Data\s*da\s*emiss[ãa]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  razaoSocial:
    // eslint-disable-next-line sonarjs/slow-regex
    /Raz[ãa]o\s*Social\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  receivingDate: /Data\s*(?:do\s*)?recebimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  transportDate: /Data\s*(?:do\s*)?transporte\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  vehiclePlateFormat: /^[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}$/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /CETESB/i,
  /Manifesto\s*de\s*Transporte/i,
  /Identifica[çc][ãa]o\s+do\s+Gerador/i,
  /Identifica[çc][ãa]o\s+do\s+Transportador/i,
  /Identifica[çc][ãa]o\s+do\s+Destinador/i,
  /CPF\/CNPJ/i,
  /Raz[ãa]o\s*Social/i,
  /IBAMA/i,
  /Res[ií]duo/i,
];

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

const stripTrailingRegistrationNumber = (name: string): string =>
  // eslint-disable-next-line sonarjs/slow-regex
  name.replace(/\s+[-–]?\s*\d{1,5}$/, '').trim();

const extractEntityFromCetesbSection = (
  text: string,
  sectionPattern: RegExp,
): undefined | { rawMatch: string; value: EntityInfo } => {
  const section = extractSection(text, sectionPattern, ALL_SECTION_PATTERNS);

  if (!section) {
    return undefined;
  }

  MTR_PATTERNS.cnpj.lastIndex = 0;
  const cnpjMatch = MTR_PATTERNS.cnpj.exec(section);

  MTR_PATTERNS.cnpj.lastIndex = 0;

  if (!cnpjMatch?.[1]) {
    return undefined;
  }

  const razaoMatch = MTR_PATTERNS.razaoSocial.exec(section);

  if (!razaoMatch?.[1]) {
    return undefined;
  }

  const name = stripTrailingRegistrationNumber(razaoMatch[1].trim());

  if (name.length <= 3) {
    return undefined;
  }

  return {
    rawMatch: section,
    value: {
      name: name as NonEmptyString,
      taxId: cnpjMatch[1] as NonEmptyString,
    },
  };
};

const DRIVER_LABEL = 'nome do motorista';
const PLATE_LABEL = 'placa do veículo';

interface DriverAndVehicle {
  driverName?: string;
  vehiclePlate?: string;
}

const extractDriverAndVehicle = (section: string): DriverAndVehicle => {
  const lines = section.split('\n').map((line) => line.trim());
  const result: DriverAndVehicle = {};

  const driverLabelIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith(DRIVER_LABEL),
  );
  const plateLabelIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith(PLATE_LABEL),
  );

  if (driverLabelIndex === -1 && plateLabelIndex === -1) {
    return result;
  }

  // Find the last label index to determine where values start
  const lastLabelIndex = Math.max(driverLabelIndex, plateLabelIndex);

  // Values appear after all labels, in the same order as labels
  const valueLines = lines
    .slice(lastLabelIndex + 1)
    .filter((line) => line.length > 0);

  if (driverLabelIndex !== -1 && plateLabelIndex !== -1) {
    // Both labels present — first value is driver, second is vehicle
    if (valueLines[0]) {
      result.driverName = valueLines[0];
    }

    if (valueLines[1]) {
      result.vehiclePlate = valueLines[1];
    }
  } else if (driverLabelIndex !== -1) {
    if (valueLines[0]) {
      result.driverName = valueLines[0];
    }
  } else if (valueLines[0]) {
    result.vehiclePlate = valueLines[0];
  }

  return result;
};

type CetesbWasteColumn =
  | 'classification'
  | 'description'
  | 'item'
  | 'packaging'
  | 'physicalState'
  | 'quantity'
  | 'treatment'
  | 'unit';

const CETESB_HEADER_DEFS: [
  HeaderColumnDefinition<CetesbWasteColumn>,
  ...Array<HeaderColumnDefinition<CetesbWasteColumn>>,
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

const CETESB_ANCHOR_COLUMN: CetesbWasteColumn = 'item';

const WASTE_CODE_PATTERN = /^(\d{6})\s*[-–]\s*(.+)/;

const parseWasteRow = (
  row: Record<string, string | undefined>,
): undefined | WasteTypeEntry => {
  const rawDescription = row['description'];

  if (!rawDescription) {
    return undefined;
  }

  const codeMatch = WASTE_CODE_PATTERN.exec(rawDescription);

  const entry: WasteTypeEntry = codeMatch?.[1]
    ? { code: codeMatch[1], description: codeMatch[2]!.trim() }
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

export class MtrCetesbSpParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-cetesb-sp';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(extractionResult.rawText, SIGNATURE_PATTERNS);
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<MtrExtractedData> {
    const { rawText } = extractionResult;
    const matchScore = this.getMatchScore(extractionResult);

    const partialData: Partial<MtrExtractedData> = {
      documentType: 'transportManifest',
      rawText,
    };

    this.extractDocumentNumber(rawText, partialData);
    this.extractIssueDate(rawText, partialData);
    this.extractTransportDate(rawText, partialData);
    this.extractReceivingDate(rawText, partialData);
    this.extractEntities(rawText, partialData);
    this.extractHaulerFields(rawText, partialData);
    this.extractWasteFields(extractionResult, partialData);

    return finalizeExtraction<MtrExtractedData>({
      allFields: [...MTR_ALL_FIELDS],
      confidenceFields: [
        partialData.documentNumber,
        partialData.issueDate,
        partialData.generator,
        partialData.hauler,
        partialData.receiver,
      ],
      documentType: 'transportManifest',
      matchScore,
      partialData,
      rawText,
      requiredFields: [...MTR_REQUIRED_FIELDS],
    });
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
    const generatorExtracted = extractEntityFromCetesbSection(
      rawText,
      SECTION_PATTERNS.gerador,
    );

    partialData.generator = entityFieldOrEmpty(generatorExtracted);

    const haulerExtracted = extractEntityFromCetesbSection(
      rawText,
      SECTION_PATTERNS.transportador,
    );

    partialData.hauler = entityFieldOrEmpty(haulerExtracted);

    const receiverExtracted = extractEntityFromCetesbSection(
      rawText,
      SECTION_PATTERNS.destinador,
    );

    partialData.receiver = entityFieldOrEmpty(receiverExtracted);
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

    if (!haulerSection) {
      return;
    }

    const { driverName, vehiclePlate } = extractDriverAndVehicle(haulerSection);

    if (driverName) {
      partialData.driverName = createHighConfidenceField(
        driverName as NonEmptyString,
        `Nome do Motorista\n${driverName}`,
      );
    }

    if (vehiclePlate && MTR_PATTERNS.vehiclePlateFormat.test(vehiclePlate)) {
      partialData.vehiclePlate = createHighConfidenceField(
        vehiclePlate as NonEmptyString,
        `Placa do Veículo\n${vehiclePlate}`,
      );
    }
  }

  private extractIssueDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const match = MTR_PATTERNS.issueDate.exec(rawText);

    if (match?.[1]) {
      partialData.issueDate = createHighConfidenceField(
        match[1] as NonEmptyString,
        match[0],
      );
    }
  }

  private extractReceivingDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const match = MTR_PATTERNS.receivingDate.exec(rawText);

    if (match?.[1]) {
      partialData.receivingDate = createHighConfidenceField(
        match[1] as NonEmptyString,
        match[0],
      );
    }
  }

  private extractTransportDate(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const match = MTR_PATTERNS.transportDate.exec(rawText);

    if (match?.[1]) {
      partialData.transportDate = createHighConfidenceField(
        match[1] as NonEmptyString,
        match[0],
      );
    }
  }

  private extractWasteFields(
    extractionResult: TextExtractionResult,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const detected = detectTableColumns(
      extractionResult.blocks,
      CETESB_HEADER_DEFS,
    );

    if (!detected) {
      return;
    }

    const { rows } = extractTableFromBlocks(extractionResult.blocks, {
      anchorColumn: CETESB_ANCHOR_COLUMN,
      columns: detected.columns as [
        TableColumnConfig<CetesbWasteColumn>,
        ...Array<TableColumnConfig<CetesbWasteColumn>>,
      ],
      maxRowGap: 0.03,
      yRange: { max: 1, min: detected.headerTop + 0.01 },
    });

    const entries = rows
      .map((row) => parseWasteRow(row))
      .filter((entry): entry is WasteTypeEntry => entry !== undefined);

    if (entries.length > 0) {
      partialData.wasteTypes = createHighConfidenceField(
        entries,
        rows
          .map((row) => row.description)
          .filter(Boolean)
          .join('\n'),
      );
    }
  }
}

registerParser('transportManifest', 'mtr-cetesb-sp', MtrCetesbSpParser);
