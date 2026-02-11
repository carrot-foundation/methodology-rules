import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  extractAllStringFields,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  extractSection,
  extractStringField,
  parseBrazilianNumber,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';

import {
  extractDriverAndVehicle,
  extractMtrEntityWithAddress,
  finalizeMtrExtraction,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntry,
} from './transport-manifest.types';

const MTR_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,
  issueDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Emissao\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  receivingDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Recebimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  transportDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Transporte\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteClassification: /Classe\s*:?\s*(.+?)(?=\n|$)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  wasteQuantity: /Quantidade\s*:?\s*([\d.,]+)\s*(kg|ton|t|m³)?/i,
  wasteType:
    // eslint-disable-next-line sonarjs/slow-regex
    /Tipo\s*(?:de\s*)?Residuo\s*:?\s*([a-z\s]+?)(?=\n|Classe|$)/i,
} as const;

const LABEL_PATTERNS = {
  driverName: /nome\s*do\s*motorista|motorista/i,
  issueDate: /Data\s*(?:(?:de|da|do)\s*)?Emissao/i,
  receivingDate: /Data\s*(?:(?:de|da|do)\s*)?Recebimento/i,
  transportDate: /Data\s*(?:(?:de|da|do)\s*)?Transporte/i,
  vehiclePlate: /placa\s*(?:do\s*)?veiculo/i,
} as const;

const SECTION_PATTERNS = {
  destinatario:
    /^\s*(?:Identificacao\s+do\s+)?(?:Destinatario|Destinador|Receptor)\s*$/i,
  gerador: /^\s*(?:Identificacao\s+do\s+)?(?:Gerador|Origem)\s*$/i,
  transportador: /^\s*(?:Identificacao\s+do\s+)?(?:Transportador)\s*$/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /Manifesto\s*de\s*Transporte/i,
  /Gerador/i,
  /Transportador/i,
  /Destinatario|Destinador/i,
  /IBAMA/i,
  /Residuo/i,
];

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

export class MtrSinirParser implements DocumentParser<MtrExtractedData> {
  readonly documentType = 'transportManifest' as const;
  readonly layoutId = 'mtr-sinir';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(
      stripAccents(extractionResult.rawText),
      SIGNATURE_PATTERNS,
    );
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<MtrExtractedData> {
    const { rawText } = extractionResult;
    const text = stripAccents(rawText);
    const matchScore = this.getMatchScore(extractionResult);

    const partialData: Partial<MtrExtractedData> = {
      documentType: 'transportManifest',
      rawText,
    };

    const documentNumberExtracted = extractStringField(
      text,
      MTR_PATTERNS.documentNumber,
    );

    if (documentNumberExtracted) {
      partialData.documentNumber = createHighConfidenceField(
        documentNumberExtracted.value as NonEmptyString,
        documentNumberExtracted.rawMatch,
      );
    }

    const issueDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.issueDate,
      LABEL_PATTERNS.issueDate,
    );

    if (issueDate) {
      partialData.issueDate = issueDate;
    }

    const transportDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.transportDate,
      LABEL_PATTERNS.transportDate,
    );

    if (transportDate) {
      partialData.transportDate = transportDate;
    }

    const receivingDate = extractFieldWithLabelFallback(
      text,
      MTR_PATTERNS.receivingDate,
      LABEL_PATTERNS.receivingDate,
    );

    if (receivingDate) {
      partialData.receivingDate = receivingDate;
    }

    partialData.generator = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.gerador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    partialData.hauler = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    partialData.receiver = extractMtrEntityWithAddress(
      text,
      SECTION_PATTERNS.destinatario,
      ALL_SECTION_PATTERNS,
      MTR_PATTERNS.cnpj,
    );

    this.extractHaulerFields(text, partialData);

    const wasteTypeMatches = extractAllStringFields(
      text,
      MTR_PATTERNS.wasteType,
    );
    const wasteClassificationExtracted = extractStringField(
      text,
      MTR_PATTERNS.wasteClassification,
    );
    const wasteQuantityExtracted = extractStringField(
      text,
      MTR_PATTERNS.wasteQuantity,
    );
    const wasteQuantity = wasteQuantityExtracted
      ? parseBrazilianNumber(wasteQuantityExtracted.value)
      : undefined;

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

    return finalizeMtrExtraction(partialData, matchScore, rawText);
  }

  private extractHaulerFields(
    rawText: string,
    partialData: Partial<MtrExtractedData>,
  ): void {
    const haulerSection = extractSection(
      rawText,
      SECTION_PATTERNS.transportador,
      ALL_SECTION_PATTERNS,
    );

    if (haulerSection) {
      const { driverName, vehiclePlate } =
        extractDriverAndVehicle(haulerSection);

      if (driverName) {
        partialData.driverName = createHighConfidenceField(
          driverName as NonEmptyString,
          `Nome do Motorista\n${driverName}`,
        );
      } else if (LABEL_PATTERNS.driverName.test(rawText)) {
        partialData.driverName = createLowConfidenceField('' as NonEmptyString);
      }

      if (vehiclePlate) {
        partialData.vehiclePlate = createHighConfidenceField(
          vehiclePlate as NonEmptyString,
          `Placa do Veiculo\n${vehiclePlate}`,
        );
      } else if (LABEL_PATTERNS.vehiclePlate.test(rawText)) {
        partialData.vehiclePlate = createLowConfidenceField(
          '' as NonEmptyString,
        );
      }

      return;
    }

    if (LABEL_PATTERNS.driverName.test(rawText)) {
      partialData.driverName = createLowConfidenceField('' as NonEmptyString);
    }

    if (LABEL_PATTERNS.vehiclePlate.test(rawText)) {
      partialData.vehiclePlate = createLowConfidenceField('' as NonEmptyString);
    }
  }
}

registerParser('transportManifest', 'mtr-sinir', MtrSinirParser);
