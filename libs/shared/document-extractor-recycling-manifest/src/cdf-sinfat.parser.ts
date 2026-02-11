import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  type DocumentParser,
  type EntityWithAddressInfo,
  type ExtractionOutput,
  extractStringField,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import {
  createRecyclerEntity,
  extractMtrNumbers,
  extractRecyclerFromPreamble,
  extractWasteClassificationData,
  finalizeCdfExtraction,
  mergeWasteEntries,
} from './cdf-shared.helpers';
import {
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

const WASTE_CODE_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex, sonarjs/regex-complexity
  /\d+\.\s*(\d{6})\s*-\s*(.+?)(?=\d+\.\s*\d{6}\s*-|Classe|$)/gs;

const MTR_SECTION_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /MTRs?\s+incluidos\s*\n([\s\S]*?)(?=\nNome\s+do\s+Respons[áa]vel|$)/i;

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

const extractWasteCodes = (
  rawText: string,
): Array<{ code: string; description: string }> => {
  const codes: Array<{ code: string; description: string }> = [];

  for (const match of rawText.matchAll(WASTE_CODE_PATTERN)) {
    if (match[1] && match[2]) {
      codes.push({
        code: match[1],
        description: match[2].trim().replaceAll('\n', ' '),
      });
    }
  }

  return codes;
};

const extractWasteEntries = (rawText: string): WasteEntry[] => {
  const codes = extractWasteCodes(rawText);
  const dataEntries = extractWasteClassificationData(rawText);

  return mergeWasteEntries(codes, dataEntries);
};

export class CdfSinfatParser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-sinfat';
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

    const recyclerExtracted = extractRecyclerFromPreamble(
      rawText,
      CDF_PATTERNS.recyclerPreamble,
    );

    partialData.recycler = createRecyclerEntity(recyclerExtracted);

    const generatorExtracted = extractGenerator(rawText);

    partialData.generator =
      createExtractedEntityWithAddress(generatorExtracted);

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

    const transportManifests = extractMtrNumbers(
      rawText,
      MTR_SECTION_PATTERN,
      10,
    );

    if (transportManifests.length > 0) {
      partialData.transportManifests =
        createHighConfidenceField(transportManifests);
    }

    return finalizeCdfExtraction(partialData, matchScore, rawText);
  }
}

registerParser('recyclingManifest', 'cdf-sinfat', CdfSinfatParser);
