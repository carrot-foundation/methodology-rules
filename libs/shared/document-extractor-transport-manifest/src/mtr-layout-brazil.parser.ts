import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  type DocumentParser,
  entityFieldOrEmpty,
  extractAllStringFields,
  extractEntityFromSection,
  type ExtractionOutput,
  extractStringField,
  finalizeExtraction,
  parseBrazilianNumber,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import {
  MTR_ALL_FIELDS,
  MTR_REQUIRED_FIELDS,
  type MtrExtractedData,
  type WasteTypeEntry,
} from './transport-manifest.types';

const MTR_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CNPJ\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
  driverName: /Motorista\s*:?\s*([A-Za-z\u00C0-\u017F\s]+?)(?=\n|CPF|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  issueDate: /Data\s*(?:de\s*)?Emiss[ãa]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  receivingDate: /Data\s*(?:de\s*)?Recebimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  transportDate: /Data\s*(?:de\s*)?Transporte\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  vehiclePlate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Placa\s*(?:do\s*)?Ve[ií]culo\s*:?\s*([A-Z]{3}[-\s]?\d[A-Z0-9]\d{2})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteClassification: /Classe\s*:?\s*(.+?)(?=\n|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /Quantidade\s*:?\s*([\d.,]+)\s*(kg|ton|t|m³)?/i,
  wasteType:
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
    /Tipo\s*(?:de\s*)?Res[ií]duo\s*:?\s*([A-Za-z\u00C0-\u017F\s]+?)(?=\n|Classe|$)/i,
} as const;

const SECTION_PATTERNS = {
  destinatario: /^\s*(?:Destinat[áa]rio|Receptor)\s*$/i,
  gerador: /^\s*(?:Gerador|Origem)\s*$/i,
  transportador: /^\s*(?:Transportador)\s*$/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /Manifesto\s*de\s*Transporte/i,
  /Gerador/i,
  /Transportador/i,
  /Destinat[áa]rio/i,
  /IBAMA/i,
  /Res[ií]duo/i,
];

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

export class MtrLayoutBrazilParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-brazil';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(extractionResult.rawText, SIGNATURE_PATTERNS);
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<MtrExtractedData> {
    const { rawText } = extractionResult;
    const matchScore = this.getMatchScore(extractionResult);

    const documentNumberExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.documentNumber,
    );
    const issueDateExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.issueDate,
    );
    const transportDateExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.transportDate,
    );
    const receivingDateExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.receivingDate,
    );
    const generatorExtracted = extractEntityFromSection(
      rawText,
      SECTION_PATTERNS.gerador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );
    const haulerExtracted = extractEntityFromSection(
      rawText,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );
    const receiverExtracted = extractEntityFromSection(
      rawText,
      SECTION_PATTERNS.destinatario,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );
    const vehiclePlateExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.vehiclePlate,
    );
    const driverNameExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.driverName,
    );
    const wasteTypeMatches = extractAllStringFields(
      rawText,
      MTR_PATTERNS.wasteType,
    );
    const wasteClassificationExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.wasteClassification,
    );
    const wasteQuantityExtracted = extractStringField(
      rawText,
      MTR_PATTERNS.wasteQuantity,
    );
    const wasteQuantity = wasteQuantityExtracted
      ? parseBrazilianNumber(wasteQuantityExtracted.value)
      : undefined;

    const partialData: Partial<MtrExtractedData> = {
      documentType: 'transportManifest',
      rawText,
    };

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    if (issueDateExtracted) {
      partialData.issueDate = createHighConfidenceField(
        issueDateExtracted.value as NonEmptyString,
        issueDateExtracted.rawMatch,
      );
    }

    if (transportDateExtracted) {
      partialData.transportDate = createHighConfidenceField(
        transportDateExtracted.value as NonEmptyString,
        transportDateExtracted.rawMatch,
      );
    }

    if (receivingDateExtracted) {
      partialData.receivingDate = createHighConfidenceField(
        receivingDateExtracted.value as NonEmptyString,
        receivingDateExtracted.rawMatch,
      );
    }

    partialData.generator = entityFieldOrEmpty(generatorExtracted);
    partialData.hauler = entityFieldOrEmpty(haulerExtracted);
    partialData.receiver = entityFieldOrEmpty(receiverExtracted);

    if (vehiclePlateExtracted) {
      partialData.vehiclePlate = createHighConfidenceField(
        vehiclePlateExtracted.value as NonEmptyString,
        vehiclePlateExtracted.rawMatch,
      );
    }

    if (driverNameExtracted) {
      partialData.driverName = createHighConfidenceField(
        driverNameExtracted.value as NonEmptyString,
        driverNameExtracted.rawMatch,
      );
    }

    if (wasteTypeMatches.length > 0) {
      const entries: WasteTypeEntry[] = wasteTypeMatches.map((m) => {
        const entry: WasteTypeEntry = { description: m.value };

        if (wasteClassificationExtracted) {
          entry.classification = wasteClassificationExtracted.value;
        }

        if (wasteQuantity !== undefined) {
          entry.quantity = wasteQuantity;
        }

        return entry;
      });

      partialData.wasteTypes = createHighConfidenceField(
        entries,
        wasteTypeMatches.map((m) => m.rawMatch).join('\n'),
      );
    }

    return finalizeExtraction<MtrExtractedData>({
      allFields: [...MTR_ALL_FIELDS],
      confidenceFields: [
        partialData.documentNumber,
        partialData.issueDate,
        partialData.generator,
        partialData.hauler,
        partialData.receiver,
      ],
      documentType: 'transportManifest',
      matchScore,
      partialData,
      rawText,
      requiredFields: [...MTR_REQUIRED_FIELDS],
    });
  }
}

registerParser('transportManifest', 'mtr-brazil', MtrLayoutBrazilParser);
