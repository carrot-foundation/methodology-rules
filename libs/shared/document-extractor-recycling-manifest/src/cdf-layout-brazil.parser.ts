import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  type EntityWithAddressInfo,
  type ExtractionOutput,
  extractStringField,
  finalizeExtraction,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import {
  CDF_ALL_FIELDS,
  CDF_REQUIRED_FIELDS,
  type CdfExtractedData,
  type WasteEntry,
} from './recycling-manifest.types';

const CDF_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /CDF\s*(?:n[°º])?\s*:?\s*(\d+(?:\/\d{2,4})?)/i,
  // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
  environmentalLicense: /Licen[çc]a\s*Ambiental\s*:?\s*([A-Za-z0-9\-/]+)/i,

  generatorAddress:
    // eslint-disable-next-line sonarjs/slow-regex
    /Endere[çc]o\s*:\s*(.+?)\s+Munic[ií]pio\s*:\s*(\S.+?)\s+UF\s*:\s*(\w{2})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  generatorName: /Raz[ãa]o\s*Social\s*:\s*(.+?)\s+CPF\/CNPJ/is,
  generatorTaxId:
    /Raz[ãa]o\s*Social\s*:[\s\S]*?CPF\/CNPJ\s*:\s*(\d{2}[\d.]+\/\d{4}-\d{2})/i,

  issueDateDeclaracao: /Declara[çc][ãa]o[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,

  processingPeriod:
    /Per[ií]odo\s*:\s*(\d{2}\/\d{2}\/\d{4}\s+at[ée]\s+\d{2}\/\d{2}\/\d{4})/is,

  recyclerPreamble:
    /^(.+?),\s*CPF\/CNPJ\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+certifica/m,
  wasteData:
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
    /Classe\s+([\w\s]+?)\s+([\d.,]+)\s+(Tonelada|kg|ton|t|m³)\s+([A-Za-z\u00C0-\u017F]+)/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteRow: /\d+\.\s*(\d{6})\s*-\s*/g,
} as const;

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /Certificado\s*de\s*Destina[çc][ãa]o/i,
  /Destina[çc][ãa]o\s*Final/i,
  /Gerador/i,
  /Identifica[çc][ãa]o\s+dos?\s+Res[ií]duos/i,
  /MTRs?\s+incluidos/i,
  /Declara[çc][ãa]o/i,
];

const extractRecycler = (
  rawText: string,
): undefined | { rawMatch: string; value: { name: string; taxId: string } } => {
  const match = CDF_PATTERNS.recyclerPreamble.exec(rawText);

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

const extractGenerator = (
  rawText: string,
): undefined | { rawMatch: string; value: EntityWithAddressInfo } => {
  const nameMatch = CDF_PATTERNS.generatorName.exec(rawText);
  const taxIdMatch = CDF_PATTERNS.generatorTaxId.exec(rawText);

  if (!nameMatch?.[1] || !taxIdMatch?.[1]) {
    return undefined;
  }

  const name = nameMatch[1].replaceAll(/\s+/g, ' ').trim();

  const entity: EntityWithAddressInfo = {
    name: name as NonEmptyString,
    taxId: taxIdMatch[1] as NonEmptyString,
  };

  const addressMatch = CDF_PATTERNS.generatorAddress.exec(rawText);

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

interface WasteCodeInfo {
  code: string;
  description: string;
}

interface WasteDataInfo {
  classification: string;
  quantity: number;
  technology: string;
  unit: string;
}

const extractWasteCodes = (rawText: string): WasteCodeInfo[] => {
  const codes: WasteCodeInfo[] = [];

  const codePattern =
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/regex-complexity
    /\d+\.\s*(\d{6})\s*-\s*(.+?)(?=\d+\.\s*\d{6}\s*-|Classe|$)/gs;

  for (const match of rawText.matchAll(codePattern)) {
    if (match[1] && match[2]) {
      codes.push({
        code: match[1],
        description: match[2].trim().replaceAll('\n', ' '),
      });
    }
  }

  return codes;
};

const extractWasteData = (rawText: string): WasteDataInfo[] => {
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

const mergeWasteEntries = (
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

const extractWasteEntries = (rawText: string): WasteEntry[] => {
  const codes = extractWasteCodes(rawText);
  const dataEntries = extractWasteData(rawText);

  return mergeWasteEntries(codes, dataEntries);
};

const MTR_SECTION_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /MTRs?\s+incluidos\s*\n([\s\S]*?)(?=\nNome\s+do\s+Respons[áa]vel|$)/i;

const extractTransportManifests = (rawText: string): string[] => {
  const sectionMatch = MTR_SECTION_PATTERN.exec(rawText);

  if (!sectionMatch?.[1]) {
    return [];
  }

  return [...sectionMatch[1].matchAll(/(\d{10})/g)].map(
    (match) => match[1] as string,
  );
};

export class CdfLayoutBrazilParser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-brazil';
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

    const documentNumberExtracted = extractStringField(
      rawText,
      CDF_PATTERNS.documentNumber,
    );

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    const recyclerExtracted = extractRecycler(rawText);

    partialData.recycler = recyclerExtracted
      ? createHighConfidenceField(
          {
            name: recyclerExtracted.value.name as NonEmptyString,
            taxId: recyclerExtracted.value.taxId as NonEmptyString,
          },
          recyclerExtracted.rawMatch,
        )
      : createLowConfidenceField({
          name: '' as NonEmptyString,
          taxId: '' as NonEmptyString,
        });

    const generatorExtracted = extractGenerator(rawText);

    partialData.generator = generatorExtracted
      ? createHighConfidenceField(
          generatorExtracted.value,
          generatorExtracted.rawMatch,
        )
      : createLowConfidenceField({
          name: '' as NonEmptyString,
          taxId: '' as NonEmptyString,
        });

    const issueDateMatch = CDF_PATTERNS.issueDateDeclaracao.exec(rawText);

    if (issueDateMatch?.[1]) {
      partialData.issueDate = createHighConfidenceField(
        issueDateMatch[1] as NonEmptyString,
        issueDateMatch[0],
      );
    }

    const processingPeriodExtracted = extractStringField(
      rawText,
      CDF_PATTERNS.processingPeriod,
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
      rawText,
      CDF_PATTERNS.environmentalLicense,
    );

    if (environmentalLicenseExtracted) {
      partialData.environmentalLicense = createHighConfidenceField(
        environmentalLicenseExtracted.value as NonEmptyString,
        environmentalLicenseExtracted.rawMatch,
      );
    }

    const wasteEntries = extractWasteEntries(rawText);

    if (wasteEntries.length > 0) {
      partialData.wasteEntries = createHighConfidenceField(wasteEntries);
    }

    const transportManifests = extractTransportManifests(rawText);

    if (transportManifests.length > 0) {
      partialData.transportManifests =
        createHighConfidenceField(transportManifests);
    }

    return finalizeExtraction<CdfExtractedData>({
      allFields: [...CDF_ALL_FIELDS],
      confidenceFields: [
        partialData.documentNumber,
        partialData.issueDate,
        partialData.generator,
        partialData.recycler,
      ],
      documentType: 'recyclingManifest',
      matchScore,
      partialData,
      rawText,
      requiredFields: [...CDF_REQUIRED_FIELDS],
    });
  }
}

registerParser('recyclingManifest', 'cdf-brazil', CdfLayoutBrazilParser);
