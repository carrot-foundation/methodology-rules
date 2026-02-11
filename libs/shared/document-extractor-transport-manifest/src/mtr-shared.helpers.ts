import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntityWithAddress,
  type ExtractedEntityWithAddressInfo,
  extractEntityFromSection,
  type ExtractionOutput,
  extractSection,
  finalizeExtraction,
} from '@carrot-fndn/shared/document-extractor';

import {
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
} from './transport-manifest.types';

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
  const lower = line.toLowerCase();

  return DRIVER_LABELS.some((label) => lower.startsWith(label));
};

const extractInlineValue = (
  line: string,
  pattern: RegExp,
): string | undefined => {
  const match = pattern.exec(line);
  const value = match?.[1]?.trim();

  return value && value.length > 0 ? value : undefined;
};

const findNameLine = (lines: string[]): string | undefined =>
  lines.find((line) => /^[a-z\s]+$/i.test(line) && line.length > 3);

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
    result.driverName = nameLine;
    const remaining = valueLines.find((line) => line !== nameLine);
    const plate = remaining;

    if (plate) {
      result.vehiclePlate = plate;
    }
  } else {
    const plateLine = valueLines.find((line) =>
      VEHICLE_PLATE_FORMAT.test(line),
    );

    if (plateLine) {
      result.vehiclePlate = plateLine;
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
    const nameLine = findNameLine(valueLines);

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
    ],
    documentType: 'transportManifest',
    matchScore,
    partialData,
    rawText,
    requiredFields: [...MTR_REQUIRED_FIELDS],
  });
