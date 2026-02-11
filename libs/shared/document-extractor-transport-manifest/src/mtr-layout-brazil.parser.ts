import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createExtractedEntityWithAddress,
  createHighConfidenceField,
  type DocumentParser,
  extractAllStringFields,
  extractEntityFromSection,
  extractFieldWithLabelFallback,
  type ExtractionOutput,
  extractSection,
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

const ADDRESS_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  address: /Endere[çc]o\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  city: /Munic[ií]pio\s*:?\s*(.+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  state: /(?:UF|Estado)\s*:?\s*(\w{2})/i,
} as const;

const MTR_PATTERNS = {
  // eslint-disable-next-line sonarjs/slow-regex
  cnpj: /CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi,
  // eslint-disable-next-line sonarjs/slow-regex
  documentNumber: /MTR\s*(?:N[°º]?)?\s*:?\s*(\d+)/i,

  driverName:
    // eslint-disable-next-line sonarjs/slow-regex, sonarjs/duplicates-in-character-class
    /Motorista[^\S\n]*:?[^\S\n]*([A-Za-z\u00C0-\u017F ]+?)(?=\n|CPF|$)/i,
  issueDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Emiss[ãa]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  receivingDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Recebimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  transportDate:
    // eslint-disable-next-line sonarjs/slow-regex
    /Data\s*(?:(?:de|da|do)\s*)?Transporte\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
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

const LABEL_PATTERNS = {
  driverName: /Motorista/i,
  issueDate: /Data\s*(?:(?:de|da|do)\s*)?Emiss[ãa]o/i,
  receivingDate: /Data\s*(?:(?:de|da|do)\s*)?Recebimento/i,
  transportDate: /Data\s*(?:(?:de|da|do)\s*)?Transporte/i,
  vehiclePlate: /Placa\s*(?:do\s*)?Ve[ií]culo/i,
} as const;

const stripTrailingRegistrationNumber = (name: string): string =>
  // eslint-disable-next-line sonarjs/slow-regex
  name.replace(/\s+[-–]?\s*\d{1,7}$/, '').trim();

const SECTION_PATTERNS = {
  destinatario:
    /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Destinat[áa]rio|Destinador|Receptor)\s*$/i,
  gerador: /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Gerador|Origem)\s*$/i,
  transportador: /^\s*(?:Identifica[çc][ãa]o\s+do\s+)?(?:Transportador)\s*$/i,
} as const;

const SIGNATURE_PATTERNS = [
  /MTR/i,
  /Manifesto\s*de\s*Transporte/i,
  /Gerador/i,
  /Transportador/i,
  /Destinat[áa]rio|Destinador/i,
  /IBAMA/i,
  /Res[ií]duo/i,
];

const ALL_SECTION_PATTERNS = Object.values(SECTION_PATTERNS);

const extractAddressFromSection = (
  text: string,
  sectionPattern: RegExp,
): undefined | { address: string; city: string; state: string } => {
  const section = extractSection(text, sectionPattern, ALL_SECTION_PATTERNS);

  if (!section) {
    return undefined;
  }

  const addressMatch = ADDRESS_PATTERNS.address.exec(section);
  const cityMatch = ADDRESS_PATTERNS.city.exec(section);
  const stateMatch = ADDRESS_PATTERNS.state.exec(section);

  if (!addressMatch?.[1] || !cityMatch?.[1] || !stateMatch?.[1]) {
    return undefined;
  }

  return {
    address: addressMatch[1].trim(),
    city: cityMatch[1].trim(),
    state: stateMatch[1].trim(),
  };
};

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

    const issueDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.issueDate,
      LABEL_PATTERNS.issueDate,
    );

    if (issueDate) {
      partialData.issueDate = issueDate;
    }

    const transportDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.transportDate,
      LABEL_PATTERNS.transportDate,
    );

    if (transportDate) {
      partialData.transportDate = transportDate;
    }

    const receivingDate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.receivingDate,
      LABEL_PATTERNS.receivingDate,
    );

    if (receivingDate) {
      partialData.receivingDate = receivingDate;
    }

    const generatorAddress = extractAddressFromSection(
      rawText,
      SECTION_PATTERNS.gerador,
    );

    partialData.generator = createExtractedEntityWithAddress(
      generatorExtracted
        ? {
            rawMatch: generatorExtracted.rawMatch,
            value: {
              ...generatorExtracted.value,
              name: stripTrailingRegistrationNumber(
                generatorExtracted.value.name,
              ) as NonEmptyString,
              ...generatorAddress,
            },
          }
        : undefined,
    );

    const haulerAddress = extractAddressFromSection(
      rawText,
      SECTION_PATTERNS.transportador,
    );

    partialData.hauler = createExtractedEntityWithAddress(
      haulerExtracted
        ? {
            rawMatch: haulerExtracted.rawMatch,
            value: {
              ...haulerExtracted.value,
              name: stripTrailingRegistrationNumber(
                haulerExtracted.value.name,
              ) as NonEmptyString,
              ...haulerAddress,
            },
          }
        : undefined,
    );

    const receiverAddress = extractAddressFromSection(
      rawText,
      SECTION_PATTERNS.destinatario,
    );

    partialData.receiver = createExtractedEntityWithAddress(
      receiverExtracted
        ? {
            rawMatch: receiverExtracted.rawMatch,
            value: {
              ...receiverExtracted.value,
              name: stripTrailingRegistrationNumber(
                receiverExtracted.value.name,
              ) as NonEmptyString,
              ...receiverAddress,
            },
          }
        : undefined,
    );

    const vehiclePlate = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.vehiclePlate,
      LABEL_PATTERNS.vehiclePlate,
    );

    if (vehiclePlate) {
      partialData.vehiclePlate = vehiclePlate;
    }

    const driverName = extractFieldWithLabelFallback(
      rawText,
      MTR_PATTERNS.driverName,
      LABEL_PATTERNS.driverName,
    );

    if (driverName) {
      partialData.driverName = driverName;
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
        partialData.generator.name,
        partialData.generator.taxId,
        partialData.hauler.name,
        partialData.hauler.taxId,
        partialData.receiver.name,
        partialData.receiver.taxId,
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
