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
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';

import {
  createRecyclerEntity,
  extractMtrNumbers,
  extractRecyclerFromPreamble,
  extractWasteClassificationData,
  finalizeCdfExtraction,
  mergeWasteEntries,
  type WasteCodeInfo,
} from './cdf-shared.helpers';
import {
  type CdfExtractedData,
  type WasteEntry,
} from './recycling-manifest.types';

const CDF_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /CDF\s*(?:n[°º])?\s*:?\s*(\d+(?:\/\d{2,4})?)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  environmentalLicense: /Licenca\s*Ambiental\s*:?\s*([a-z0-9\-/]+)/i,

  generatorAddress:
    // eslint-disable-next-line sonarjs/slow-regex
    /Endereco\s*:\s*(.+?)\s+Municipio\s*:\s*(\S.+?)\s+UF\s*:?\s*(\w{2})/i,

  generatorName:
    // eslint-disable-next-line sonarjs/slow-regex
    /(?:Razao\s*Social|Nome)\s*:?\s*\n?\s*(.+?)(?=\n|$)/im,
  generatorTaxId:
    // eslint-disable-next-line sonarjs/slow-regex
    /(?:CPF\/CNPJ|CNPJ\/CPF|CNPJ)\s*:\s*\n?\s*(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i,

  issueDateBeforeResponsavel:
    // eslint-disable-next-line sonarjs/slow-regex
    /(\d{2}\/\d{2}\/\d{4})\s*\n\s*Responsavel/i,
  issueDateDeclaracao: /Declaracao[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,

  processingPeriod:
    // eslint-disable-next-line sonarjs/slow-regex
    /Periodo\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s+(?:a|ate)\s+\d{2}\/\d{2}\/\d{4})/is,

  recyclerPreamble:
    /^(.+?),\s*CPF\/CNPJ\s+(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+certifica/m,
} as const;

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /CERTIFICADO\s*DE\s*DESTINA/i,
  /Sistema\s+MTR\s+do\s+Sinir/i,
  /Gerador/i,
  /Identificacao\s+dos?\s+Residuos/i,
  /Manifestos?\s+Incluidos/i,
  /Declaracao/i,
  /Tratamento/i,
];

const UNNUMBERED_WASTE_CODE_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /^(\d{6})\s*-\s*(.+?)(?=\n\d{6}\s*-|Classe|$)/gm;

const MTR_SECTION_PATTERN =
  // eslint-disable-next-line sonarjs/slow-regex
  /Manifestos?\s+Incluidos\s*:?\s*\n?([\s\S]*?)(?=\nNome\s+do\s+Responsavel|Declaracao|$)/i;

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

const extractWasteCodes = (rawText: string): WasteCodeInfo[] => {
  const codes: WasteCodeInfo[] = [];

  for (const match of rawText.matchAll(UNNUMBERED_WASTE_CODE_PATTERN)) {
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

export class CdfSinirParser implements DocumentParser<CdfExtractedData> {
  readonly documentType = 'recyclingManifest' as const;
  readonly layoutId = 'cdf-sinir';
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

    const documentNumberExtracted = extractStringField(
      text,
      CDF_PATTERNS.documentNumber,
    );

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    const recyclerExtracted = extractRecyclerFromPreamble(
      text,
      CDF_PATTERNS.recyclerPreamble,
    );

    partialData.recycler = createRecyclerEntity(recyclerExtracted);

    const generatorExtracted = extractGenerator(text);

    partialData.generator =
      createExtractedEntityWithAddress(generatorExtracted);

    const issueDateMatch =
      CDF_PATTERNS.issueDateDeclaracao.exec(text) ??
      CDF_PATTERNS.issueDateBeforeResponsavel.exec(text);

    if (issueDateMatch?.[1]) {
      partialData.issueDate = createHighConfidenceField(
        issueDateMatch[1] as NonEmptyString,
        issueDateMatch[0],
      );
    }

    const processingPeriodExtracted = extractStringField(
      text,
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
      text,
      CDF_PATTERNS.environmentalLicense,
    );

    if (environmentalLicenseExtracted) {
      partialData.environmentalLicense = createHighConfidenceField(
        environmentalLicenseExtracted.value as NonEmptyString,
        environmentalLicenseExtracted.rawMatch,
      );
    }

    const wasteEntries = extractWasteEntries(text);

    if (wasteEntries.length > 0) {
      partialData.wasteEntries = createHighConfidenceField(wasteEntries);
    }

    const transportManifests = extractMtrNumbers(text, MTR_SECTION_PATTERN, 12);

    if (transportManifests.length > 0) {
      partialData.transportManifests =
        createHighConfidenceField(transportManifests);
    }

    return finalizeCdfExtraction(partialData, matchScore, rawText);
  }
}

registerParser('recyclingManifest', 'cdf-sinir', CdfSinirParser);
