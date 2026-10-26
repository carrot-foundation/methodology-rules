import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  type ExtractionOutput,
  finalizeExtraction,
  parseBrazilianNumber,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';

import type {
  ScaleTicketExtractedData,
  WeightData,
} from './scale-ticket.types';

const SIGNATURE_PATTERNS = [
  /Ticket de pesagem Documentos/i,
  /Ticket Encerrado/i,
  /Pre-Entrada/i,
  /Liq\. Corrigido/i,
  /Liq\. Convertido/i,
];

const WEIGHINGS_HEADER = /Pesagem Inicial/i;
const NET_TABLE_HEADER = /^(?:Peso Liquido|Liq\. Corrigido)$/i;
const WEIGHT_IN_KG = /^([\d.,]+) kg$/i;

const ALL_FIELDS = ['netWeight'] as const;

interface WeightLine {
  rawMatch: string;
  valueInKg: number;
}

const readWeightLines = (lines: string[]): WeightLine[] =>
  lines.flatMap((line) => {
    const valueInKg = parseBrazilianNumber(WEIGHT_IN_KG.exec(line)?.[1] ?? '');

    return valueInKg === undefined ? [] : [{ rawMatch: line, valueInKg }];
  });

const roundToGrams = (valueInKg: number): number =>
  Math.round(valueInKg * 1000) / 1000;

export class ScaleTicketToledoGuardianParser implements DocumentParser<ScaleTicketExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'toledo-guardian' as NonEmptyString;
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(
      stripAccents(extractionResult.rawText),
      SIGNATURE_PATTERNS,
    );
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<ScaleTicketExtractedData> {
    const { rawText } = extractionResult;
    const lines = stripAccents(rawText)
      .split('\n')
      .map((line) => line.trim());

    const weighingsStart = lines.findIndex((line) =>
      WEIGHINGS_HEADER.test(line),
    );
    const netTableStart = lines.findIndex((line) =>
      NET_TABLE_HEADER.test(line),
    );

    const weighings =
      weighingsStart === -1 || netTableStart === -1
        ? []
        : readWeightLines(lines.slice(weighingsStart, netTableStart));
    const [firstWeighing, secondWeighing] = weighings;
    const weighedNet =
      firstWeighing &&
      secondWeighing &&
      roundToGrams(
        Math.abs(firstWeighing.valueInKg - secondWeighing.valueInKg),
      );

    const [tableNet] =
      netTableStart === -1 ? [] : readWeightLines(lines.slice(netTableStart));

    const partialData: Partial<ScaleTicketExtractedData> = {
      documentType: 'scaleTicket',
      rawText,
    };

    const netValueInKg = tableNet?.valueInKg ?? weighedNet;

    if (netValueInKg !== undefined) {
      const value: WeightData = {
        unit: 'kg' as NonEmptyString,
        value: netValueInKg,
      };

      partialData.netWeight =
        tableNet?.valueInKg === weighedNet
          ? createHighConfidenceField(value, tableNet?.rawMatch)
          : createLowConfidenceField(value, tableNet?.rawMatch);
    }

    return finalizeExtraction<ScaleTicketExtractedData>({
      allFields: [...ALL_FIELDS],
      confidenceFields: [partialData.netWeight],
      documentType: 'scaleTicket',
      matchScore: this.getMatchScore(extractionResult),
      partialData,
      rawText,
    });
  }
}

registerParser(
  'scaleTicket',
  'toledo-guardian',
  ScaleTicketToledoGuardianParser,
);
