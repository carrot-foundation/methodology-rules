import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  createLowConfidenceField,
  type ExtractedEntityWithAddressInfo,
  type ExtractedField,
  extractEntityFromSection,
  type ExtractionOutput,
  extractSection,
  finalizeExtraction,
} from '@carrot-fndn/shared/document-extractor';

import {
  type ExtractedWasteTypeEntry,
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
  type WasteTypeEntryData,
} from './transport-manifest.types';

export const MTR_DEFAULT_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /(?:CPF\/)?CNPJ\s*:?\s*(\d{2}\.?\s*\d{3}\.?\s*\d{3}\/?\s*\d{4}-?\s*\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  issueDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Emissao\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  receivingDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Recebimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  transportDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Transporte\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteClassification: /Classe\s*:?\s*(.+?)(?=\n|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /Quantidade\s*:?\s*([\d.,]+)\s*(kg|ton|t|m³)?/i,
  wasteType:
    // eslint-disable-next-line sonarjs/slow-regex
    /Tipo\s*(?:de\s*)?Residuo\s*:?\s*([a-z\s]+?)(?=\n|Classe|$)/i,
} as const;

export const MTR_DEFAULT_LABEL_PATTERNS = {
  driverName: /nome\s*do\s*motorista|motorista/i,
  issueDate: /Data\s*(?:(?:de|da|do)\s*)?Emissao/i,
  receivingDate: /Data\s*(?:(?:de|da|do)\s*)?Recebimento/i,
  transportDate: /Data\s*(?:(?:de|da|do)\s*)?Transporte/i,
  vehiclePlate: /placa\s*(?:do\s*)?veiculo/i,
} as const;

export const MTR_DEFAULT_SECTION_PATTERNS = {
  destinatario:
    /^\s*(?:Identificacao\s+do\s+)?(?:Destinatario|Destinador|Receptor)\s*$/i,
  gerador: /^\s*(?:Identificacao\s+do\s+)?(?:Gerador|Origem)\s*$/i,
  transportador: /^\s*(?:Identificacao\s+do\s+)?(?:Transportador)\s*$/i,
} as const;

export const MTR_ADDRESS_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  address: /Endereco\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  city: /Municipio\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  state: /(?:UF|Estado)\s*:?\s*(\w{2})/i,
} as const;

export const stripTrailingRegistrationNumber = (name: string): string =>
  // eslint-disable-next-line sonarjs/slow-regex
  name.replace(/\s+[-–]?\s*\d{1,7}$/, '').trim();

export const extractAddressFields = (
  sectionText: string,
): undefined | { address: string; city: string; state: string } => {
  const addressMatch = MTR_ADDRESS_PATTERNS.address.exec(sectionText);
  const cityMatch = MTR_ADDRESS_PATTERNS.city.exec(sectionText);
  const stateMatch = MTR_ADDRESS_PATTERNS.state.exec(sectionText);

  if (!addressMatch?.[1] || !cityMatch?.[1] || !stateMatch?.[1]) {
    return undefined;
  }

  return {
    address: addressMatch[1].trim(),
    city: cityMatch[1].trim(),
    state: stateMatch[1].trim(),
  };
};

export const extractMtrEntityWithAddress = (
  rawText: string,
  sectionPattern: RegExp,
  allSectionPatterns: RegExp[],
  cnpjPattern: RegExp,
): ExtractedEntityWithAddressInfo => {
  const entityExtracted = extractEntityFromSection(
    rawText,
    sectionPattern,
    allSectionPatterns,
    cnpjPattern,
  );

  const section = extractSection(rawText, sectionPattern, allSectionPatterns);
  const addressFields = section ? extractAddressFields(section) : undefined;

  return createExtractedEntityWithAddress(
    entityExtracted
      ? {
          rawMatch: entityExtracted.rawMatch,
          value: {
            ...entityExtracted.value,
            name: stripTrailingRegistrationNumber(
              entityExtracted.value.name,
            ) as NonEmptyString,
            ...addressFields,
          },
        }
      : undefined,
  );
};

const DRIVER_LABELS = ['nome do motorista', 'motorista'] as const;
const PLATE_LABEL = 'placa do veiculo';
const VEHICLE_PLATE_FORMAT = /^[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}$/i;
const BOILERPLATE_PATTERN =
  /nome\s+e\s+assinatura|cargo|responsavel|assinatura/i;

export interface DriverAndVehicle {
  driverName?: string;
  vehiclePlate?: string;
}

// eslint-disable-next-line sonarjs/slow-regex
const INLINE_DRIVER_PATTERN = /(?:nome\s+do\s+)?motorista\s*:?\s*([a-z ]+)/i;
const INLINE_PLATE_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /placa\s*(?:do\s*)?veiculo\s*:?\s*([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2})/i;

const isDriverLabel = (line: string): boolean => {
  const lower = line.toLowerCase().trim();

  return DRIVER_LABELS.some(
    (label) =>
      lower === label ||
      lower.startsWith(`${label}:`) ||
      lower.startsWith(`${label} `),
  );
};

const extractInlineValue = (
  line: string,
  pattern: RegExp,
): string | undefined => {
  const match = pattern.exec(line);
  const value = match?.[1]?.trim();

  return value && value.length > 0 ? value : undefined;
};

const MIN_DRIVER_NAME_LENGTH = 2;

const findNameLine = (lines: string[]): string | undefined =>
  lines.find(
    (line) =>
      /^[a-z\s.'\-,]+$/i.test(line) && line.length >= MIN_DRIVER_NAME_LENGTH,
  );

const isValueLine = (line: string): boolean =>
  line.length > 0 &&
  !isDriverLabel(line) &&
  !line.toLowerCase().startsWith(PLATE_LABEL) &&
  !BOILERPLATE_PATTERN.test(line);

const extractFromBothLabels = (
  valueLines: string[],
  result: DriverAndVehicle,
): void => {
  const nameLine = findNameLine(valueLines);

  if (nameLine) {
    const remaining = valueLines.find((line) => line !== nameLine);

    if (remaining) {
      result.driverName = nameLine;
      result.vehiclePlate = remaining;
    } else if (nameLine.includes(' ') || nameLine.length > 7) {
      result.driverName = nameLine;
    }
  } else {
    const plateLine = valueLines.find((line) =>
      VEHICLE_PLATE_FORMAT.test(line),
    );

    if (plateLine) {
      result.vehiclePlate = plateLine;
      const remaining = valueLines.find((line) => line !== plateLine);

      if (remaining && remaining.length >= MIN_DRIVER_NAME_LENGTH) {
        result.driverName = remaining;
      }
    }
  }
};

const tryInlineExtraction = (
  lines: string[],
  driverLabelIndex: number,
  plateLabelIndex: number,
): DriverAndVehicle | undefined => {
  const driverLine =
    driverLabelIndex === -1 ? undefined : lines[driverLabelIndex];
  const plateLine = plateLabelIndex === -1 ? undefined : lines[plateLabelIndex];

  const inlineDriver = driverLine
    ? extractInlineValue(driverLine, INLINE_DRIVER_PATTERN)
    : undefined;
  const inlinePlate = plateLine
    ? extractInlineValue(plateLine, INLINE_PLATE_PATTERN)
    : undefined;

  if (!inlineDriver && !inlinePlate) {
    return undefined;
  }

  const result: DriverAndVehicle = {};

  if (inlineDriver) {
    result.driverName = inlineDriver;
  }

  if (inlinePlate) {
    result.vehiclePlate = inlinePlate;
  }

  return result;
};

const extractFromSingleLabel = (
  valueLines: string[],
  hasDriverLabel: boolean,
): DriverAndVehicle => {
  const result: DriverAndVehicle = {};

  if (hasDriverLabel) {
    const nameLine =
      findNameLine(valueLines) ??
      valueLines.find((line) => line.length >= MIN_DRIVER_NAME_LENGTH);

    if (nameLine) {
      result.driverName = nameLine;
    }
  } else {
    const foundPlate = valueLines.find((line) =>
      VEHICLE_PLATE_FORMAT.test(line),
    );

    if (foundPlate) {
      result.vehiclePlate = foundPlate;
    }
  }

  return result;
};

export const extractDriverAndVehicle = (section: string): DriverAndVehicle => {
  const lines = section.split('\n').map((line) => line.trim());

  const driverLabelIndex = lines.findIndex((line) => isDriverLabel(line));
  const plateLabelIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith(PLATE_LABEL),
  );

  if (driverLabelIndex === -1 && plateLabelIndex === -1) {
    return {};
  }

  const inlineResult = tryInlineExtraction(
    lines,
    driverLabelIndex,
    plateLabelIndex,
  );

  if (inlineResult) {
    return inlineResult;
  }

  const lastLabelIndex = Math.max(driverLabelIndex, plateLabelIndex);
  const valueLines = lines
    .slice(lastLabelIndex + 1)
    .filter((line) => isValueLine(line));

  if (driverLabelIndex !== -1 && plateLabelIndex !== -1) {
    const result: DriverAndVehicle = {};

    extractFromBothLabels(valueLines, result);

    return result;
  }

  return extractFromSingleLabel(valueLines, driverLabelIndex !== -1);
};

export const createExtractedWasteTypeEntry = (
  raw: WasteTypeEntryData,
): ExtractedWasteTypeEntry => {
  const entry: ExtractedWasteTypeEntry = {
    code: raw.code
      ? createHighConfidenceField(raw.code)
      : createLowConfidenceField(''),
    description: createHighConfidenceField(raw.description),
    quantity:
      raw.quantity === undefined
        ? // eslint-disable-next-line unicorn/no-useless-undefined
          createLowConfidenceField<number | undefined>(undefined)
        : createHighConfidenceField<number | undefined>(raw.quantity),
    unit: raw.unit
      ? createHighConfidenceField(raw.unit)
      : createLowConfidenceField(''),
  };

  if (raw.classification !== undefined) {
    entry.classification = createHighConfidenceField(raw.classification);
  }

  return entry;
};

export const toWasteTypeEntryData = (
  entry: ExtractedWasteTypeEntry,
): WasteTypeEntryData => {
  const data: WasteTypeEntryData = {
    description: entry.description.parsed,
  };

  if (entry.code.parsed) {
    data.code = entry.code.parsed;
  }

  if (entry.quantity.parsed !== undefined) {
    data.quantity = entry.quantity.parsed;
  }

  if (entry.unit.parsed) {
    data.unit = entry.unit.parsed;
  }

  if (entry.classification?.parsed) {
    data.classification = entry.classification.parsed;
  }

  return data;
};

const collectWasteTypeConfidenceFields = (
  wasteTypes: ExtractedWasteTypeEntry[] | undefined,
): Array<ExtractedField<unknown>> => {
  if (!wasteTypes) {
    return [];
  }

  return wasteTypes.flatMap((entry) => {
    const fields: Array<ExtractedField<unknown>> = [
      entry.code,
      entry.description,
      entry.quantity,
      entry.unit,
    ];

    if (entry.classification) {
      fields.push(entry.classification);
    }

    return fields;
  });
};

export const extractHaulerFields = (
  rawText: string,
  partialData: Partial<MtrExtractedData>,
): void => {
  const haulerSection = extractSection(
    rawText,
    MTR_DEFAULT_SECTION_PATTERNS.transportador,
    Object.values(MTR_DEFAULT_SECTION_PATTERNS),
  );

  if (haulerSection) {
    const { driverName, vehiclePlate } = extractDriverAndVehicle(haulerSection);

    if (driverName) {
      partialData.driverName = createHighConfidenceField(
        driverName as NonEmptyString,
        `Nome do Motorista\n${driverName}`,
      );
    } else if (MTR_DEFAULT_LABEL_PATTERNS.driverName.test(rawText)) {
      partialData.driverName = createLowConfidenceField('' as NonEmptyString);
    }

    if (vehiclePlate) {
      partialData.vehiclePlate = createHighConfidenceField(
        vehiclePlate as NonEmptyString,
        `Placa do Veiculo\n${vehiclePlate}`,
      );
    } else if (MTR_DEFAULT_LABEL_PATTERNS.vehiclePlate.test(rawText)) {
      partialData.vehiclePlate = createLowConfidenceField('' as NonEmptyString);
    }

    return;
  }

  if (MTR_DEFAULT_LABEL_PATTERNS.driverName.test(rawText)) {
    partialData.driverName = createLowConfidenceField('' as NonEmptyString);
  }

  if (MTR_DEFAULT_LABEL_PATTERNS.vehiclePlate.test(rawText)) {
    partialData.vehiclePlate = createLowConfidenceField('' as NonEmptyString);
  }
};

export const finalizeMtrExtraction = (
  partialData: Partial<MtrExtractedData>,
  matchScore: number,
  rawText: string,
): ExtractionOutput<MtrExtractedData> =>
  finalizeExtraction<MtrExtractedData>({
    allFields: [...MTR_ALL_FIELDS],
    confidenceFields: [
      partialData.documentNumber,
      partialData.issueDate,
      partialData.generator?.name,
      partialData.generator?.taxId,
      partialData.hauler?.name,
      partialData.hauler?.taxId,
      partialData.receiver?.name,
      partialData.receiver?.taxId,
      ...collectWasteTypeConfidenceFields(partialData.wasteTypes),
    ],
    documentType: 'transportManifest',
    matchScore,
    partialData,
    rawText,
    requiredFields: [...MTR_REQUIRED_FIELDS],
  });
