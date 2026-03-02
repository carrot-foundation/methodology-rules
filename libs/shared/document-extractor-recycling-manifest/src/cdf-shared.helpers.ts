import type {
  HeaderColumnDefinition,
  TableColumnConfig,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntity,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  type EntityWithAddressInfo,
  type ExtractedEntityInfo,
  type ExtractionOutput,
  extractStringField,
  finalizeExtraction,
  parseBrazilianNumber,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';
import {
  detectTableColumns,
  extractTableFromBlocks,
  normalizeMultiPageBlocks,
} from '@carrot-fndn/shared/text-extractor';

import {
  CDF_ALL_FIELDS,
  type CdfExtractedData,
  type WasteEntry,
} from './recycling-manifest.types';

export const extractRecyclerFromPreamble = (
  rawText: string,
  preamblePattern: RegExp,
): undefined | { rawMatch: string; value: { name: string; taxId: string } } => {
  const match = preamblePattern.exec(rawText);

  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  return {
    rawMatch: match[0],
    value: {
      name: match[1].trim(),
      taxId: match[2],
    },
  };
};

export const createRecyclerEntity = (
  recyclerExtracted:
    | undefined
    | { rawMatch: string; value: { name: string; taxId: string } },
): ExtractedEntityInfo =>
  createExtractedEntity(
    recyclerExtracted
      ? {
          rawMatch: recyclerExtracted.rawMatch,
          value: {
            name: recyclerExtracted.value.name as NonEmptyString,
            taxId: recyclerExtracted.value.taxId as NonEmptyString,
          },
        }
      : undefined,
  );

export const extractMtrNumbers = (
  rawText: string,
  sectionPattern: RegExp,
  digitCount: number,
): string[] => {
  const sectionMatch = sectionPattern.exec(rawText);

  if (!sectionMatch?.[1]) {
    return [];
  }

  const digitPattern = new RegExp(`(\\d{${String(digitCount)}})`, 'g');

  return [...sectionMatch[1].matchAll(digitPattern)].map(
    (match) => match[1] as string,
  );
};

export const extractGenerator = (
  rawText: string,
  patterns: {
    generatorAddress: RegExp;
    generatorName: RegExp;
    generatorTaxId: RegExp;
  },
): undefined | { rawMatch: string; value: EntityWithAddressInfo } => {
  const nameMatch = patterns.generatorName.exec(rawText);
  const taxIdMatch = patterns.generatorTaxId.exec(rawText);

  if (!nameMatch?.[1] || !taxIdMatch?.[1]) {
    return undefined;
  }

  const name = nameMatch[1].replaceAll(/\s+/g, ' ').trim();

  const entity: EntityWithAddressInfo = {
    name: name as NonEmptyString,
    taxId: taxIdMatch[1] as NonEmptyString,
  };

  const addressMatch = patterns.generatorAddress.exec(rawText);

  if (addressMatch?.[1] && addressMatch[2] && addressMatch[3]) {
    entity.address = addressMatch[1].trim();
    entity.city = addressMatch[2].trim();
    entity.state = addressMatch[3].trim();
  }

  const rawMatch = rawText.slice(
    nameMatch.index,
    taxIdMatch.index + taxIdMatch[0].length,
  );

  return { rawMatch, value: entity };
};

export const finalizeCdfExtraction = (
  partialData: Partial<CdfExtractedData>,
  matchScore: number,
  rawText: string,
): ExtractionOutput<CdfExtractedData> =>
  finalizeExtraction<CdfExtractedData>({
    allFields: [...CDF_ALL_FIELDS],
    confidenceFields: [
      partialData.documentNumber,
      partialData.issueDate,
      partialData.generator?.name,
      partialData.generator?.taxId,
      partialData.recycler?.name,
      partialData.recycler?.taxId,
    ],
    documentType: 'recyclingManifest',
    matchScore,
    partialData,
    rawText,
  });

export interface CdfParseConfig {
  issueDatePatterns: RegExp[];
  mtrDigitCount: number;
  mtrSectionPattern: RegExp;
  patterns: {
    documentNumber: RegExp;
    environmentalLicense: RegExp;
    generatorAddress: RegExp;
    generatorName: RegExp;
    generatorTaxId: RegExp;
    processingPeriod: RegExp;
    recyclerPreamble: RegExp;
  };
  wasteTable: CdfWasteTableConfig;
}

export interface CdfWasteTableConfig {
  anchorColumn: string;
  codePattern: RegExp;
  headerDefs: [HeaderColumnDefinition, ...Array<HeaderColumnDefinition>];
  technologyColumn: string;
}

const parseCdfWasteRow = (
  row: Record<string, string | undefined>,
  config: CdfWasteTableConfig,
): undefined | WasteEntry => {
  const wasteText = row[config.anchorColumn]?.trim();

  // istanbul ignore next -- anchor-based row extraction guarantees non-empty waste text
  if (!wasteText) {
    return undefined;
  }

  const codeMatch = config.codePattern.exec(wasteText);

  if (!codeMatch?.[1]) {
    return undefined;
  }

  const entry: WasteEntry = {
    code: codeMatch[1],
    description: codeMatch[2]!.trim(),
  };

  const classification = row['classification']?.trim();

  if (classification) {
    entry.classification = classification;
  }

  const quantity = parseBrazilianNumber(row['quantity']?.trim() ?? '');

  if (quantity !== undefined) {
    entry.quantity = quantity;
  }

  const unit = row['unit']?.trim();

  if (unit) {
    entry.unit = unit;
  }

  const technology = row[config.technologyColumn]?.trim();

  if (technology) {
    entry.technology = technology;
  }

  return entry;
};

export const extractCdfWasteEntries = (
  extractionResult: TextExtractionResult,
  config: CdfWasteTableConfig,
): undefined | WasteEntry[] => {
  const blocks = normalizeMultiPageBlocks(extractionResult.blocks);
  const detected = detectTableColumns(blocks, config.headerDefs);

  if (!detected) {
    return undefined;
  }

  const { rows } = extractTableFromBlocks(blocks, {
    anchorColumn: config.anchorColumn,
    columns: detected.columns as [
      TableColumnConfig,
      ...Array<TableColumnConfig>,
    ],
    maxRowGap: 0.03,
    xTolerance: 0.2,
    yRange: { max: 100, min: detected.headerTop + 0.01 },
  });

  const entries = rows
    .map((row) => parseCdfWasteRow(row, config))
    .filter((r): r is WasteEntry => r !== undefined);

  return entries.length > 0 ? entries : undefined;
};

export const parseCdfDocument = (
  extractionResult: TextExtractionResult,
  matchScore: number,
  config: CdfParseConfig,
): ExtractionOutput<CdfExtractedData> => {
  const { rawText } = extractionResult;
  const text = stripAccents(rawText);

  const partialData: Partial<CdfExtractedData> = {
    documentType: 'recyclingManifest',
    rawText,
  };

  const documentNumberExtracted = extractStringField(
    text,
    config.patterns.documentNumber,
  );

  if (documentNumberExtracted) {
    partialData.documentNumber = createHighConfidenceField(
      documentNumberExtracted.value as NonEmptyString,
      documentNumberExtracted.rawMatch,
    );
  }

  const recyclerExtracted = extractRecyclerFromPreamble(
    text,
    config.patterns.recyclerPreamble,
  );

  partialData.recycler = createRecyclerEntity(recyclerExtracted);

  const generatorExtracted = extractGenerator(text, {
    generatorAddress: config.patterns.generatorAddress,
    generatorName: config.patterns.generatorName,
    generatorTaxId: config.patterns.generatorTaxId,
  });

  partialData.generator = createExtractedEntityWithAddress(generatorExtracted);

  for (const pattern of config.issueDatePatterns) {
    const issueDateMatch = pattern.exec(text);

    if (issueDateMatch?.[1]) {
      partialData.issueDate = createHighConfidenceField(
        issueDateMatch[1] as NonEmptyString,
        issueDateMatch[0],
      );

      break;
    }
  }

  const processingPeriodExtracted = extractStringField(
    text,
    config.patterns.processingPeriod,
  );

  if (processingPeriodExtracted) {
    const normalizedPeriod = processingPeriodExtracted.value
      .replaceAll('\n', ' ')
      .replaceAll(/\s+/g, ' ');

    partialData.processingPeriod = createHighConfidenceField(
      normalizedPeriod as NonEmptyString,
      processingPeriodExtracted.rawMatch,
    );
  }

  const environmentalLicenseExtracted = extractStringField(
    text,
    config.patterns.environmentalLicense,
  );

  if (environmentalLicenseExtracted) {
    partialData.environmentalLicense = createHighConfidenceField(
      environmentalLicenseExtracted.value as NonEmptyString,
      environmentalLicenseExtracted.rawMatch,
    );
  }

  const wasteEntries = extractCdfWasteEntries(
    extractionResult,
    config.wasteTable,
  );

  if (wasteEntries && wasteEntries.length > 0) {
    partialData.wasteEntries = createHighConfidenceField(wasteEntries);
  }

  const transportManifests = extractMtrNumbers(
    text,
    config.mtrSectionPattern,
    config.mtrDigitCount,
  );

  if (transportManifests.length > 0) {
    partialData.transportManifests =
      createHighConfidenceField(transportManifests);
  }

  return finalizeCdfExtraction(partialData, matchScore, rawText);
};
