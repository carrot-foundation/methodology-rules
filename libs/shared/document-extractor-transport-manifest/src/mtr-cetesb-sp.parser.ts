import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
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
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
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
  vehiclePlateFormat: /^[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}$/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /([\d.,]+)\s*(TON|KG|T|M³)/i,
  // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
  wasteType: /(\d{6})\s*[-–]\s*([A-Za-z\u00C0-\u017F\s].+?)(?=\n|$)/i,
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
    this.extractEntities(rawText, partialData);
    this.extractTransporterFields(rawText, partialData);
    this.extractWasteFields(rawText, partialData);

    return finalizeExtraction<MtrExtractedData>({
      allFields: [...MTR_ALL_FIELDS],
      confidenceFields: [
        partialData.documentNumber,
        partialData.issueDate,
        partialData.generator,
        partialData.transporter,
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

    const transporterExtracted = extractEntityFromCetesbSection(
      rawText,
      SECTION_PATTERNS.transportador,
    );

    partialData.transporter = entityFieldOrEmpty(transporterExtracted);

    const receiverExtracted = extractEntityFromCetesbSection(
      rawText,
      SECTION_PATTERNS.destinador,
    );

    partialData.receiver = entityFieldOrEmpty(receiverExtracted);
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

  private extractTransporterFields(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const transporterSection = extractSection(
      rawText,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
    );

    if (!transporterSection) {
      return;
    }

    const { driverName, vehiclePlate } =
      extractDriverAndVehicle(transporterSection);

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

  private extractWasteFields(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const wasteSection = extractSection(
      rawText,
      SECTION_PATTERNS.residuos,
      ALL_SECTION_PATTERNS,
    );
    const searchText = wasteSection ?? rawText;

    const wasteTypeMatch = MTR_PATTERNS.wasteType.exec(searchText);

    if (wasteTypeMatch?.[1] && wasteTypeMatch[2]) {
      const wasteTypeValue = `${wasteTypeMatch[1]}-${wasteTypeMatch[2].trim()}`;

      partialData.wasteType = createHighConfidenceField(
        wasteTypeValue as NonEmptyString,
        wasteTypeMatch[0],
      );
    }

    const quantityMatch = MTR_PATTERNS.wasteQuantity.exec(searchText);

    if (quantityMatch?.[1]) {
      const quantity = parseBrazilianNumber(quantityMatch[1]);

      if (quantity !== undefined) {
        partialData.wasteQuantity = createHighConfidenceField(
          quantity,
          quantityMatch[0],
        );
      }
    }

    const classificationLines = searchText.split('\n');
    const classeIndex = classificationLines.findIndex((line) =>
      /^\s*CLASSE\s*$/i.test(line),
    );

    if (classeIndex !== -1) {
      const nextLine = classificationLines[classeIndex + 1]?.trim();

      if (nextLine && nextLine.length > 0) {
        partialData.wasteClassification = createHighConfidenceField(
          nextLine as NonEmptyString,
          `CLASSE\n${nextLine}`,
        );
      }
    }
  }
}

registerParser('transportManifest', 'mtr-cetesb-sp', MtrCetesbSpParser);
