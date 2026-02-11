import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createExtractedEntity,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  type EntityInfo,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  parseBrazilianNumber,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import {
  buildWasteEntriesFromSubtotals,
  extractCadriNumbers,
  extractWasteSubtotals,
  extractWasteTypeDescriptions,
  finalizeCdfExtraction,
  parseReceiptTableRows,
  toReceiptEntries,
} from './cdf-shared.helpers';
import { type CdfExtractedData } from './recycling-manifest.types';

const MONTHS: Record<string, string> = {
  abril: '04',
  agosto: '08',
  dezembro: '12',
  fevereiro: '02',
  janeiro: '01',
  julho: '07',
  junho: '06',
  maio: '05',
  março: '03',
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
  environmentalLicense: /licen[çc]a\s+n[°º]\s*:?\s*(\d+)/i,
  // eslint-disable-next-line sonarjs/duplicates-in-character-class
  issueDate: /(\d{1,2})\s+de\s+([A-Za-z\u00C0-\u017F]+)\s+de\s+(\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  totalQuantity: /Quantidade\s+Total\s+Tratad[oa]\s*\n?\s*([\d.,]+)/i,
  treatmentMethod:
    // eslint-disable-next-line sonarjs/slow-regex
    /atrav[ée]s\s+d[aeo]\s+(.+?),?\s+certifica/i,
} as const;

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /Certificado\s*de\s*Destina[çc][ãa]o\s*Final/i,
  /Empresa\s+Recebedora/i,
  /Empresa\s+Geradora/i,
  /Quantidade\s+Total\s+Tratad/i,
  /Cadastro\s+na\s+Cetesb/i,
  /CADRI/i,
  /matérias?-primas?/i,
];

const LABEL_PATTERNS = {
  documentNumber: /(?:CDF|N[°º])/i,
  environmentalLicense: /licen[çc]a\s+n[°º]/i,
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

export class CdfCustom1Parser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-custom-1';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(extractionResult.rawText, SIGNATURE_PATTERNS);
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<CdfExtractedData> {
    const { rawText } = extractionResult;
    const matchScore = this.getMatchScore(extractionResult);

    const partialData: Partial<CdfExtractedData> = {
      documentType: 'recyclingManifest',
      rawText,
    };

    const documentNumber = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.documentNumber,
      LABEL_PATTERNS.documentNumber,
    );

    if (documentNumber) {
      partialData.documentNumber = documentNumber;
    }

    this.extractIssueDate(rawText, partialData);
    this.extractEntities(rawText, partialData);

    const environmentalLicense = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.environmentalLicense,
      LABEL_PATTERNS.environmentalLicense,
    );

    if (environmentalLicense) {
      partialData.environmentalLicense = environmentalLicense;
    }
    this.extractTreatmentMethod(rawText, partialData);
    this.extractTableData(rawText, partialData);

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

    const generatorExtracted = extractEntityByLabel(
      rawText,
      CDF_PATTERNS.empresaGeradora,
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

  private extractTableData(
    rawText: string,
    partialData: Partial<CdfExtractedData>,
  ): void {
    const rows = parseReceiptTableRows(rawText);

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
    }

    const subtotals = extractWasteSubtotals(rawText);

    if (subtotals.length > 0) {
      const descriptions = extractWasteTypeDescriptions(rawText);
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

    this.extractWasteQuantityFallback(rawText, partialData);
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
