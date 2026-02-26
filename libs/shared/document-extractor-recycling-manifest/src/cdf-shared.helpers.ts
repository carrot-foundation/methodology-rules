import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntity,
  type EntityWithAddressInfo,
  type ExtractedEntityInfo,
  type ExtractionOutput,
  finalizeExtraction,
} from '@carrot-fndn/shared/document-extractor';

import {
  CDF_ALL_FIELDS,
  type CdfExtractedData,
  type WasteEntry,
} from './recycling-manifest.types';

export interface WasteCodeInfo {
  code: string;
  description: string;
}

export interface WasteDataInfo {
  classification: string;
  quantity: number;
  technology: string;
  unit: string;
}

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

export const extractWasteClassificationData = (
  rawText: string,
): WasteDataInfo[] => {
  const dataEntries: WasteDataInfo[] = [];

  const dataPattern =
    // eslint-disable-next-line sonarjs/slow-regex
    /Classe\s+([\w\s]+?)\s+([\d.,]+)\s+(Tonelada|kg|ton|t|m³)\s+([a-z]+)/gi;

  for (const match of rawText.matchAll(dataPattern)) {
    if (match[1] && match[2] && match[3] && match[4]) {
      const cleaned = match[2].replaceAll('.', '').replace(',', '.');
      const quantity = Number.parseFloat(cleaned);

      dataEntries.push({
        classification: `Classe ${match[1].trim()}`,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
        technology: match[4].trim(),
        unit: match[3].trim(),
      });
    }
  }

  return dataEntries;
};

export const mergeWasteEntries = (
  codes: WasteCodeInfo[],
  dataEntries: WasteDataInfo[],
): WasteEntry[] => {
  const entries: WasteEntry[] = [];

  for (
    let index = 0;
    index < Math.max(codes.length, dataEntries.length);
    index++
  ) {
    // eslint-disable-next-line security/detect-object-injection
    const code = codes[index];
    // eslint-disable-next-line security/detect-object-injection
    const data = dataEntries[index];

    const entry: WasteEntry = {
      description: code?.description ?? '',
    };

    if (code?.code) {
      entry.code = code.code;
    }

    if (data) {
      entry.classification = data.classification;
      entry.quantity = data.quantity;
      entry.unit = data.unit;
      entry.technology = data.technology;
    }

    entries.push(entry);
  }

  return entries;
};

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
