import type {
  HeaderColumnDefinition,
  TableColumnConfig,
  TableRow,
  TextExtractionResult,
} from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createExtractedEntity,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  type EntityInfo,
  type EntityWithAddressInfo,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  parseBrazilianNumber,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';
import {
  detectTableColumns,
  extractTableFromBlocks,
  normalizeMultiPageBlocks,
} from '@carrot-fndn/shared/text-extractor';

import { finalizeCdfExtraction } from './cdf-shared.helpers';
import {
  type CdfExtractedData,
  type ReceiptEntry,
  type WasteEntry,
} from './recycling-manifest.types';

interface ReceiptTableRow {
  cadri?: string;
  quantity: number;
  receiptDate: string;
  wasteType: string;
}

interface WasteSubtotal {
  quantity: number;
  wasteType: string;
}

interface WasteTypeDescription {
  description: string;
  wasteType: string;
}

const parseDdMmYyyy = (dateString: string): Date | undefined => {
  const [dd, mm, yyyy] = dateString.split('/');

  // istanbul ignore next -- defensive check; regex ensures dd/mm/yyyy format
  if (!dd || !mm || !yyyy) {
    return undefined;
  }

  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  // istanbul ignore next -- defensive check; JS Date with numeric values is always valid
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const derivePeriodFromReceiptDates = (
  rows: ReceiptTableRow[],
): string | undefined => {
  let minDate: Date | undefined;
  let maxDate: Date | undefined;
  let minDateString = '';
  let maxDateString = '';

  for (const row of rows) {
    const date = parseDdMmYyyy(row.receiptDate);

    // istanbul ignore next -- defensive check; regex ensures valid date format
    if (!date) {
      continue;
    }

    if (!minDate || date < minDate) {
      minDate = date;
      minDateString = row.receiptDate;
    }

    if (!maxDate || date > maxDate) {
      maxDate = date;
      maxDateString = row.receiptDate;
    }
  }

  // istanbul ignore next -- defensive check; at least one valid date exists when rows are present
  if (!minDate || !maxDate) {
    return undefined;
  }

  return `${minDateString} ate ${maxDateString}`;
};

const parseReceiptTableRows = (rawText: string): ReceiptTableRow[] => {
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

type CdfTableColumn = 'cadri' | 'quantity' | 'receiptDate' | 'wasteType';

const CDF_TABLE_HEADER_DEFS: [
  HeaderColumnDefinition<CdfTableColumn>,
  ...Array<HeaderColumnDefinition<CdfTableColumn>>,
] = [
  { headerPattern: /Data\s+de\s+recebimento/i, name: 'receiptDate' },
  { headerPattern: /Tipo\s+de\s+Mat[eé]ria-Prima/i, name: 'wasteType' },
  { headerPattern: /CADRI/i, name: 'cadri' },
  { headerPattern: /Quantidade\s+Recebida/i, name: 'quantity' },
];

const CDF_TABLE_ANCHOR: CdfTableColumn = 'wasteType';

// Multi-page normalized coordinates can exceed 1.0 per page (normalizeMultiPageBlocks adds N-1 for page N)
const MULTI_PAGE_Y_MAX = 100;

const parseCdfTableRow = (
  row: TableRow<CdfTableColumn>,
): ReceiptTableRow | undefined => {
  const wasteType = row.wasteType?.trim();
  const receiptDate = row.receiptDate?.trim();
  const quantityString = row.quantity?.trim();

  if (!wasteType || !receiptDate || !quantityString) {
    return undefined;
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(receiptDate)) {
    return undefined;
  }

  const quantity = parseBrazilianNumber(quantityString);

  if (quantity === undefined) {
    return undefined;
  }

  const tableRow: ReceiptTableRow = {
    quantity,
    receiptDate,
    wasteType: stripAccents(wasteType),
  };

  const cadri = row.cadri?.trim();

  if (cadri && /^\d{5,}$/.test(cadri)) {
    tableRow.cadri = cadri;
  }

  return tableRow;
};

const toReceiptEntries = (rows: ReceiptTableRow[]): ReceiptEntry[] =>
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

const extractCadriNumbers = (rows: ReceiptTableRow[]): string[] => [
  ...new Set(rows.filter((r) => r.cadri !== undefined).map((r) => r.cadri!)),
];

const extractWasteTypeDescriptions = (
  rawText: string,
): WasteTypeDescription[] => {
  const descriptions: WasteTypeDescription[] = [];

  const sectionEnd = /(?:Descricao|Tipo\s+de\s+Materia-Prima)\s*:/i.exec(
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

const extractWasteSubtotals = (rawText: string): WasteSubtotal[] => {
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

const buildWasteEntriesFromSubtotals = (
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

const MONTHS: Record<string, string> = {
  abril: '04',
  agosto: '08',
  dezembro: '12',
  fevereiro: '02',
  janeiro: '01',
  julho: '07',
  junho: '06',
  maio: '05',
  marco: '03',
  novembro: '11',
  outubro: '10',
  setembro: '09',
};

const CDF_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/gi,
  documentNumber: /(?:CDF|N[°º])\s*(\d+\/\d{2,4})/i,
  empresaGeradora:
    // eslint-disable-next-line sonarjs/slow-regex
    /Empresa\s+Geradora\s*:\s*(.+?)(?=\n|$)/i,
  empresaRecebedora:
    // eslint-disable-next-line sonarjs/slow-regex
    /Empresa\s+Recebedora\s*:\s*(.+?)(?=\n|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  environmentalLicense: /licenca\s+n[°º]\s*:?\s*(\d+)/i,
  issueDate: /(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  totalQuantity: /Quantidade\s+Total\s+Tratad[oa]\s*\n?\s*([\d.,]+)/i,
  treatmentMethod:
    // eslint-disable-next-line sonarjs/slow-regex
    /atraves\s+d[aeo]\s+(.+?),?\s+certifica/i,
} as const;

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /Certificado\s*de\s*Destinacao\s*Final/i,
  /Empresa\s+Recebedora/i,
  /Empresa\s+Geradora/i,
  /Quantidade\s+Total\s+Tratad/i,
  /Cadastro\s+na\s+Cetesb/i,
  /CADRI/i,
  /materias?-primas?/i,
];

const LABEL_PATTERNS = {
  documentNumber: /(?:CDF|N[°º])/i,
  environmentalLicense: /licenca\s+n[°º]/i,
  wasteQuantity: /Quantidade\s+Total\s+Tratad/i,
} as const;

const parseLongDate = (
  day: string,
  monthName: string,
  year: string,
): string | undefined => {
  const month = MONTHS[monthName.toLowerCase()];

  if (!month) {
    return undefined;
  }

  return `${day.padStart(2, '0')}/${month}/${year}`;
};

const extractEntityByLabel = (
  text: string,
  labelPattern: RegExp,
): undefined | { rawMatch: string; value: EntityInfo } => {
  const nameMatch = labelPattern.exec(text);

  if (!nameMatch?.[1]) {
    return undefined;
  }

  const name = nameMatch[1].trim();

  if (name.length <= 3) {
    return undefined;
  }

  // Find the CNPJ that follows this entity label
  const textAfterLabel = text.slice(nameMatch.index);
  // eslint-disable-next-line sonarjs/slow-regex
  const cnpjPattern = /CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i;
  const cnpjMatch = cnpjPattern.exec(textAfterLabel);

  if (!cnpjMatch?.[1]) {
    return undefined;
  }

  return {
    rawMatch: textAfterLabel.slice(0, cnpjMatch.index + cnpjMatch[0].length),
    value: {
      name: name as NonEmptyString,
      taxId: cnpjMatch[1] as NonEmptyString,
    },
  };
};

const GENERATOR_ADDRESS_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /Endereco\s*:\s*(.+),\s*(.+?)\s*\/\s*(\w{2})(?:\s+CEP)?/i;

const extractGeneratorWithAddress = (
  rawText: string,
  entity: undefined | { rawMatch: string; value: EntityInfo },
): undefined | { rawMatch: string; value: EntityWithAddressInfo } => {
  if (!entity) {
    return undefined;
  }

  const textAfterGenerator = rawText.slice(
    Math.max(0, rawText.search(/Empresa\s+Geradora/i)),
  );
  const addressMatch = GENERATOR_ADDRESS_PATTERN.exec(textAfterGenerator);

  if (!addressMatch?.[1] || !addressMatch[2] || !addressMatch[3]) {
    return entity;
  }

  return {
    rawMatch: entity.rawMatch,
    value: {
      ...entity.value,
      address: addressMatch[1].trim(),
      city: addressMatch[2].trim(),
      state: addressMatch[3].trim(),
    },
  };
};

export class CdfCustom1Parser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-custom-1';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(
      stripAccents(extractionResult.rawText),
      SIGNATURE_PATTERNS,
    );
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<CdfExtractedData> {
    const { rawText } = extractionResult;
    const text = stripAccents(rawText);
    const matchScore = this.getMatchScore(extractionResult);

    const partialData: Partial<CdfExtractedData> = {
      documentType: 'recyclingManifest',
      rawText,
    };

    const documentNumber = extractFieldWithLabelFallback(
      text,
      CDF_PATTERNS.documentNumber,
      LABEL_PATTERNS.documentNumber,
    );

    if (documentNumber) {
      partialData.documentNumber = documentNumber;
    }

    this.extractIssueDate(text, partialData);
    this.extractEntities(text, partialData);

    const environmentalLicense = extractFieldWithLabelFallback(
      text,
      CDF_PATTERNS.environmentalLicense,
      LABEL_PATTERNS.environmentalLicense,
    );

    if (environmentalLicense) {
      partialData.environmentalLicense = environmentalLicense;
    }
    this.extractTreatmentMethod(text, partialData);
    this.extractTableData(extractionResult, partialData);

    return finalizeCdfExtraction(partialData, matchScore, rawText);
  }

  private extractEntities(
    rawText: string,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const processorExtracted = extractEntityByLabel(
      rawText,
      CDF_PATTERNS.empresaRecebedora,
    );

    partialData.recycler = createExtractedEntity(processorExtracted);

    const generatorExtracted = extractGeneratorWithAddress(
      rawText,
      extractEntityByLabel(rawText, CDF_PATTERNS.empresaGeradora),
    );

    partialData.generator =
      createExtractedEntityWithAddress(generatorExtracted);
  }

  private extractIssueDate(
    rawText: string,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const match = CDF_PATTERNS.issueDate.exec(rawText);

    if (match?.[1] && match[2] && match[3]) {
      const formatted = parseLongDate(match[1], match[2], match[3]);

      if (formatted) {
        partialData.issueDate = createHighConfidenceField(
          formatted as NonEmptyString,
          match[0],
        );
      }
    }
  }

  private extractReceiptRows(
    extractionResult: TextExtractionResult,
  ): ReceiptTableRow[] {
    const normalized = normalizeMultiPageBlocks(extractionResult.blocks);
    const detected = detectTableColumns(normalized, CDF_TABLE_HEADER_DEFS);

    if (detected) {
      const { rows } = extractTableFromBlocks(normalized, {
        anchorColumn: CDF_TABLE_ANCHOR,
        columns: detected.columns as [
          TableColumnConfig<CdfTableColumn>,
          ...Array<TableColumnConfig<CdfTableColumn>>,
        ],
        maxRowGap: 0.03,
        xTolerance: 0.05,
        yRange: { max: MULTI_PAGE_Y_MAX, min: detected.headerTop + 0.01 },
      });

      const parsed = rows
        .map((row) => parseCdfTableRow(row))
        .filter((r): r is ReceiptTableRow => r !== undefined);

      if (parsed.length > 0) {
        return parsed;
      }
    }

    // Fallback: regex on raw text (for cases where block detection fails)
    return parseReceiptTableRows(stripAccents(extractionResult.rawText));
  }

  private extractTableData(
    extractionResult: TextExtractionResult,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const rows = this.extractReceiptRows(extractionResult);

    if (rows.length > 0) {
      partialData.receiptEntries = createHighConfidenceField(
        toReceiptEntries(rows),
        `${String(rows.length)} receipt table rows`,
      );

      const cadriNumbers = extractCadriNumbers(rows);

      if (cadriNumbers.length > 0) {
        partialData.transportManifests = createHighConfidenceField(
          cadriNumbers,
          cadriNumbers.join(', '),
        );
      }

      const period = derivePeriodFromReceiptDates(rows);

      if (period) {
        partialData.processingPeriod = createHighConfidenceField(
          period as NonEmptyString,
          period,
        );
      }
    }

    const text = stripAccents(extractionResult.rawText);
    const subtotals = extractWasteSubtotals(text);

    if (subtotals.length > 0) {
      const descriptions = extractWasteTypeDescriptions(text);
      const wasteEntries = buildWasteEntriesFromSubtotals(
        subtotals,
        descriptions,
      );

      partialData.wasteEntries = createHighConfidenceField(
        wasteEntries,
        subtotals
          .map((s) => `${s.wasteType}: ${String(s.quantity)}`)
          .join('; '),
      );

      return;
    }

    this.extractWasteQuantityFallback(text, partialData);
  }

  private extractTreatmentMethod(
    rawText: string,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const match = CDF_PATTERNS.treatmentMethod.exec(rawText);

    if (match?.[1]) {
      partialData.treatmentMethod = createHighConfidenceField(
        match[1].trim() as NonEmptyString,
        match[0],
      );
    }
  }

  private extractWasteQuantityFallback(
    rawText: string,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const match = CDF_PATTERNS.totalQuantity.exec(rawText);

    if (match?.[1]) {
      const quantity = parseBrazilianNumber(match[1]);

      if (quantity !== undefined) {
        partialData.wasteEntries = createHighConfidenceField(
          [{ description: '', quantity }],
          match[0],
        );
      }
    } else if (LABEL_PATTERNS.wasteQuantity.test(rawText)) {
      partialData.wasteEntries = createLowConfidenceField([
        { description: '', quantity: 0 },
      ]);
    }
  }
}

registerParser('recyclingManifest', 'cdf-custom-1', CdfCustom1Parser);
