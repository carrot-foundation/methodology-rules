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
  createExtractedWasteTypeEntry,
  extractDriverAndVehicle,
  extractMtrEntityWithAddress,
  finalizeMtrExtraction,
  MTR_DEFAULT_LABEL_PATTERNS,
  MTR_DEFAULT_PATTERNS,
  MTR_DEFAULT_SECTION_PATTERNS,
} from './mtr-shared.helpers';
import {
  type MtrExtractedData,
  type WasteTypeEntryData,
} from './transport-manifest.types';

const MTR_PATTERNS = { ...MTR_DEFAULT_PATTERNS } as const;
const LABEL_PATTERNS = { ...MTR_DEFAULT_LABEL_PATTERNS } as const;
const SECTION_PATTERNS = { ...MTR_DEFAULT_SECTION_PATTERNS } as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /Manifesto\s*de\s*Transporte/i,
  /Gerador/i,
  /Transportador/i,
  /Destinatario|Destinador/i,
  /IBAMA/i,
  /Residuo/i,
  /Tipo\s*(?:de\s*)?Residuo/i,
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
      const entries: WasteTypeEntryData[] = wasteTypeMatches.map((m) => {
        const entry: WasteTypeEntryData = { description: m.value };

        if (wasteClassificationExtracted) {
          entry.classification = wasteClassificationExtracted.value;
        }

        if (wasteQuantity !== undefined) {
          entry.quantity = wasteQuantity;
        }

        return entry;
      });

      partialData.wasteTypes = entries.map((entry) =>
        createExtractedWasteTypeEntry(entry),
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
