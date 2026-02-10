import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  type DocumentParser,
  entityFieldOrEmpty,
  extractEntityFromSection,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  extractStringField,
  finalizeExtraction,
  parseBrazilianNumber,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import {
  CDF_ALL_FIELDS,
  CDF_REQUIRED_FIELDS,
  type CdfExtractedData,
} from './recycling-manifest.types';

const CDF_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/gi,
  documentNumber:
    // eslint-disable-next-line sonarjs/slow-regex
    /(?:CDF|Certificado)\s*(?:de\s*Destina[çc][ãa]o\s*(?:Final)?)?\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
  environmentalLicense: /Licen[çc]a\s*Ambiental\s*:?\s*([A-Za-z0-9\-/]+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  issueDate: /Data\s*(?:de\s*)?Emiss[ãa]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  processingPeriod:
    // eslint-disable-next-line sonarjs/slow-regex
    /Per[ií]odo\s*(?:de\s*)?(?:Processamento|Tratamento)\s*:?\s*(.+?)(?=\n|$)/i,
  treatmentMethod:
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
    /(?:M[ée]todo|Tipo)\s*(?:de\s*)?(?:Tratamento|Processamento)\s*:?\s*([A-Za-z\u00C0-\u017F\s]+?)(?=\n|Quantidade|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /Quantidade\s*(?:Total)?\s*:?\s*([\d.,]+)\s*(kg|ton|t|m³)?/i,
} as const;

const SECTION_PATTERNS = {
  destinador: /^\s*(?:Processador|Destinador|Tratador)\s*$/i,
  gerador: /^\s*(?:Gerador|Origem)\s*$/i,
} as const;

const SIGNATURE_PATTERNS = [
  /CDF/i,
  /Certificado\s*de\s*Destina[çc][ãa]o/i,
  /Destina[çc][ãa]o\s*Final/i,
  /Gerador/i,
  /Processador|Destinador|Tratador/i,
  /Tratamento/i,
  /Res[ií]duo/i,
];

const LABEL_PATTERNS = {
  environmentalLicense: /Licen[çc]a\s*Ambiental/i,
  issueDate: /Data\s*(?:de\s*)?Emiss[ãa]o/i,
  processingPeriod: /Per[ií]odo\s*(?:de\s*)?(?:Processamento|Tratamento)/i,
  treatmentMethod:
    /(?:M[ée]todo|Tipo)\s*(?:de\s*)?(?:Tratamento|Processamento)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /Quantidade\s*(?:Total)?\s*:/i,
} as const;

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

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

    const documentNumberExtracted = extractStringField(
      rawText,
      CDF_PATTERNS.documentNumber,
    );
    const generatorExtracted = extractEntityFromSection(
      rawText,
      SECTION_PATTERNS.gerador,
      ALL_SECTION_PATTERNS,
      CDF_PATTERNS.cnpj,
    );
    const processorExtracted = extractEntityFromSection(
      rawText,
      SECTION_PATTERNS.destinador,
      ALL_SECTION_PATTERNS,
      CDF_PATTERNS.cnpj,
    );
    const wasteQuantityExtracted = extractStringField(
      rawText,
      CDF_PATTERNS.wasteQuantity,
    );

    const partialData: Partial<CdfExtractedData> = {
      documentType: 'recyclingManifest',
      rawText,
    };

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    const issueDate = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.issueDate,
      LABEL_PATTERNS.issueDate,
    );

    if (issueDate) {
      partialData.issueDate = issueDate;
    }

    partialData.generator = entityFieldOrEmpty(generatorExtracted);
    partialData.processor = entityFieldOrEmpty(processorExtracted);

    const environmentalLicense = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.environmentalLicense,
      LABEL_PATTERNS.environmentalLicense,
    );

    if (environmentalLicense) {
      partialData.environmentalLicense = environmentalLicense;
    }

    const treatmentMethod = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.treatmentMethod,
      LABEL_PATTERNS.treatmentMethod,
    );

    if (treatmentMethod) {
      partialData.treatmentMethod = treatmentMethod;
    }

    const processingPeriod = extractFieldWithLabelFallback(
      rawText,
      CDF_PATTERNS.processingPeriod,
      LABEL_PATTERNS.processingPeriod,
    );

    if (processingPeriod) {
      partialData.processingPeriod = processingPeriod;
    }

    if (wasteQuantityExtracted) {
      const quantity = parseBrazilianNumber(wasteQuantityExtracted.value);

      if (quantity !== undefined) {
        partialData.wasteQuantity = createHighConfidenceField(
          quantity,
          wasteQuantityExtracted.rawMatch,
        );
      }
    }

    return finalizeExtraction<CdfExtractedData>({
      allFields: [...CDF_ALL_FIELDS],
      confidenceFields: [
        partialData.documentNumber,
        partialData.issueDate,
        partialData.generator,
        partialData.processor,
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
