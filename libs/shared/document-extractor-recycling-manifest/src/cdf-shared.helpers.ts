import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  createExtractedEntity,
  type ExtractedEntityInfo,
  type ExtractionOutput,
  finalizeExtraction,
  parseBrazilianNumber,
} from '@carrot-fndn/shared/document-extractor';

import {
  CDF_ALL_FIELDS,
  CDF_REQUIRED_FIELDS,
  type CdfExtractedData,
  type ReceiptEntry,
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
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
    /Classe\s+([\w\s]+?)\s+([\d.,]+)\s+(Tonelada|kg|ton|t|m³)\s+([A-Za-z\u00C0-\u017F]+)/gi;

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

export interface ReceiptTableRow {
  cadri?: string;
  quantity: number;
  receiptDate: string;
  wasteType: string;
}

export interface WasteSubtotal {
  quantity: number;
  wasteType: string;
}

export interface WasteTypeDescription {
  description: string;
  wasteType: string;
}

export const parseReceiptTableRows = (rawText: string): ReceiptTableRow[] => {
  const rows: ReceiptTableRow[] = [];

  const rowPattern =
    // eslint-disable-next-line sonarjs/slow-regex
    /^(.+?)\s+(-|\d{5,})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s*$/gm;

  for (const match of rawText.matchAll(rowPattern)) {
    const [, wasteType, cadriField, receiptDate, quantityString] = match;

    const quantity = parseBrazilianNumber(quantityString!);

    if (quantity === undefined) {
      continue;
    }

    const row: ReceiptTableRow = {
      quantity,
      receiptDate: receiptDate!,
      wasteType: wasteType!.trim(),
    };

    if (cadriField !== undefined && cadriField !== '-') {
      row.cadri = cadriField;
    }

    rows.push(row);
  }

  return rows;
};

export const extractWasteTypeDescriptions = (
  rawText: string,
): WasteTypeDescription[] => {
  const descriptions: WasteTypeDescription[] = [];

  const sectionEnd = /(?:Descrição|Tipo\s+de\s+Mat[ée]ria-Prima)\s*:/i.exec(
    rawText,
  );
  const sectionStart = /IE\s*:\s*[\d.]+/i.exec(rawText);

  if (!sectionStart || !sectionEnd) {
    return descriptions;
  }

  const section = rawText.slice(
    sectionStart.index + sectionStart[0].length,
    sectionEnd.index,
  );

  // eslint-disable-next-line sonarjs/slow-regex
  const linePattern = /^([^:]+):\s*(.+?)\s*$/gm;

  for (const match of section.matchAll(linePattern)) {
    if (match[1] && match[2]) {
      descriptions.push({
        description: match[2].trim(),
        wasteType: match[1].trim(),
      });
    }
  }

  return descriptions;
};

export const extractWasteSubtotals = (rawText: string): WasteSubtotal[] => {
  const subtotals: WasteSubtotal[] = [];

  // eslint-disable-next-line sonarjs/slow-regex
  const pattern = /Quantidade\s+Tratada\s+de\s+(.+?)\s+([\d.,]+)\s*$/gm;

  for (const match of rawText.matchAll(pattern)) {
    const [, wasteType, quantityString] = match;

    const quantity = parseBrazilianNumber(quantityString!);

    if (quantity === undefined) {
      continue;
    }

    subtotals.push({
      quantity,
      wasteType: wasteType!.trim(),
    });
  }

  return subtotals;
};

export const buildWasteEntriesFromSubtotals = (
  subtotals: WasteSubtotal[],
  descriptions: WasteTypeDescription[],
): WasteEntry[] => {
  const descriptionMap = new Map(
    descriptions.map((d) => [d.wasteType.toUpperCase(), d.description]),
  );

  return subtotals.map((subtotal) => ({
    description:
      descriptionMap.get(subtotal.wasteType.toUpperCase()) ??
      subtotal.wasteType,
    quantity: subtotal.quantity,
    unit: 'ton',
  }));
};

export const extractCadriNumbers = (rows: ReceiptTableRow[]): string[] => [
  ...new Set(rows.filter((r) => r.cadri !== undefined).map((r) => r.cadri!)),
];

export const toReceiptEntries = (rows: ReceiptTableRow[]): ReceiptEntry[] =>
  rows.map((row) => {
    const entry: ReceiptEntry = {
      quantity: row.quantity,
      receiptDate: row.receiptDate,
      wasteType: row.wasteType,
    };

    if (row.cadri !== undefined) {
      entry.cadri = row.cadri;
    }

    return entry;
  });

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
    requiredFields: [...CDF_REQUIRED_FIELDS],
  });
