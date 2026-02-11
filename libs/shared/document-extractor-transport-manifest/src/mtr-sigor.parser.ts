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
  createLowConfidenceField,
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
  extractAddressFields,
  finalizeMtrExtraction,
  stripTrailingRegistrationNumber,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntry,
} from './transport-manifest.types';

const SECTION_PATTERNS = {
  destinador: /^\s*Identificacao\s+do\s+Destinador\s*$/i,
  gerador: /^\s*Identificacao\s+do\s+Gerador\s*$/i,
  residuos: /^\s*Identificacao\s+dos\s+Residuos\s*$/i,
  transportador: /^\s*Identificacao\s+do\s+Transportador\s*$/i,
} as const;

const MTR_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CPF\/CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  issueDate: /Data\s*da\s*emissao\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  razaoSocial:
    // eslint-disable-next-line sonarjs/slow-regex
    /Razao\s*Social\s*:?\s*(.+)/i,
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
  /Identificacao\s+do\s+Gerador/i,
  /Identificacao\s+do\s+Transportador/i,
  /Identificacao\s+do\s+Destinador/i,
  /CPF\/CNPJ/i,
  /Razao\s*Social/i,
  /IBAMA/i,
  /Residuo/i,
];

const LABEL_PATTERNS = {
  driverName: /nome\s*do\s*motorista/i,
  issueDate: /Data\s*da\s*emissao/i,
  receivingDate: /Data\s*(?:do\s*)?recebimento/i,
  transportDate: /Data\s*(?:do\s*)?transporte/i,
  vehiclePlate: /placa\s*do\s*veiculo/i,
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

  const addressData = extractAddressFields(section);

  return {
    rawMatch: section,
    value: {
      name: name as NonEmptyString,
      taxId: cnpjMatch[1] as NonEmptyString,
      ...addressData,
    },
  };
};

const DRIVER_LABEL = 'nome do motorista';
const PLATE_LABEL = 'placa do veiculo';

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

export class MtrSigorParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-sigor';
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
    this.extractHaulerFields(text, partialData);
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
    } else if (LABEL_PATTERNS.driverName.test(haulerSection)) {
      partialData.driverName = createLowConfidenceField('' as NonEmptyString);
    }

    if (vehiclePlate && MTR_PATTERNS.vehiclePlateFormat.test(vehiclePlate)) {
      partialData.vehiclePlate = createHighConfidenceField(
        vehiclePlate as NonEmptyString,
        `Placa do Veiculo\n${vehiclePlate}`,
      );
    } else if (LABEL_PATTERNS.vehiclePlate.test(haulerSection)) {
      partialData.vehiclePlate = createLowConfidenceField('' as NonEmptyString);
    }
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

registerParser('transportManifest', 'mtr-sigor', MtrSigorParser);
