import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  createLowConfidenceField,
  type DocumentParser,
  type ExtractedField,
  type ExtractionOutput,
  finalizeExtraction,
  registerParser,
  stripAccents,
} from '@carrot-fndn/shared/document-extractor';

import type {
  ScaleTicketExtractedData,
  WeightData,
} from './scale-ticket.types';

const WEIGHT_LABELS = {
  gross: /Peso Bruto \(A\)/i,
  net: /Peso Liquido \(A-?B\)/i,
  tare: /Tara \(B\)/i,
} as const;

const SIGNATURE_PATTERNS = [
  /PESAGEM MANUAL/i,
  WEIGHT_LABELS.gross,
  WEIGHT_LABELS.net,
  WEIGHT_LABELS.tare,
  /Motivo da pesagem em manual/i,
];

const SECTION_END = /Motivo da pesagem/i;

const HANDWRITTEN_WEIGHT = /^(\d+)(?:$|[.,-](\d{1,3})$)/;

const ALL_FIELDS = ['netWeight', 'initialWeight', 'finalWeight'] as const;

type CandidatesInKg = [number, ...number[]];

interface HandwrittenWeight {
  candidatesInKg: CandidatesInKg;
  rawMatch: string;
}

// The form is filled in kg; a decimal comma ("2,47", "0,750") means tonnes.
const readCandidatesInKg = (
  integerPart: string,
  fractionPart: string | undefined,
): CandidatesInKg => {
  const integer = Number(integerPart);

  if (fractionPart === undefined) {
    return [integer, integer * 1000];
  }

  return [integer * 1000 + Number(fractionPart.padEnd(3, '0'))];
};

const findWeightAfterLabel = (
  lines: string[],
  label: RegExp,
): HandwrittenWeight | undefined => {
  const labelIndex = lines.findIndex((line) => label.test(line));

  if (labelIndex === -1) {
    return undefined;
  }

  for (const line of lines.slice(labelIndex + 1)) {
    if (
      Object.values(WEIGHT_LABELS).some((pattern) => pattern.test(line)) ||
      SECTION_END.test(line)
    ) {
      return undefined;
    }

    const match = HANDWRITTEN_WEIGHT.exec(line);

    if (match?.[1]) {
      return {
        candidatesInKg: readCandidatesInKg(match[1], match[2]),
        rawMatch: line,
      };
    }
  }

  return undefined;
};

const reconcile = (
  gross: HandwrittenWeight,
  tare: HandwrittenWeight,
  net: HandwrittenWeight,
): undefined | { gross: number; net: number; tare: number } => {
  for (const grossKg of gross.candidatesInKg) {
    for (const tareKg of tare.candidatesInKg) {
      const netKg = net.candidatesInKg.find(
        (candidate) => grossKg - tareKg === candidate,
      );

      if (netKg !== undefined) {
        return { gross: grossKg, net: netKg, tare: tareKg };
      }
    }
  }

  return undefined;
};

const toWeightField = (
  weight: HandwrittenWeight,
  reconciledValueInKg: number | undefined,
): ExtractedField<WeightData> => {
  const value: WeightData = {
    unit: 'kg' as NonEmptyString,
    value: reconciledValueInKg ?? weight.candidatesInKg[0],
  };

  return reconciledValueInKg === undefined
    ? createLowConfidenceField(value, weight.rawMatch)
    : createHighConfidenceField(value, weight.rawMatch);
};

export class ScaleTicketPesagemManualParser implements DocumentParser<ScaleTicketExtractedData> {
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'pesagem-manual' as NonEmptyString;
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

    const gross = findWeightAfterLabel(lines, WEIGHT_LABELS.gross);
    const tare = findWeightAfterLabel(lines, WEIGHT_LABELS.tare);
    const net = findWeightAfterLabel(lines, WEIGHT_LABELS.net);

    const reconciled = gross && tare && net && reconcile(gross, tare, net);

    const partialData: Partial<ScaleTicketExtractedData> = {
      documentType: 'scaleTicket',
      rawText,
    };

    if (net) {
      partialData.netWeight = toWeightField(net, reconciled?.net);
    }

    // The receiving scale weighs the loaded truck first (A), then the empty one (B).
    if (gross) {
      partialData.initialWeight = toWeightField(gross, reconciled?.gross);
    }

    if (tare) {
      partialData.finalWeight = toWeightField(tare, reconciled?.tare);
    }

    return finalizeExtraction<ScaleTicketExtractedData>({
      allFields: [...ALL_FIELDS],
      confidenceFields: [
        partialData.netWeight,
        partialData.initialWeight,
        partialData.finalWeight,
      ],
      documentType: 'scaleTicket',
      matchScore: this.getMatchScore(extractionResult),
      partialData,
      rawText,
    });
  }
}

registerParser('scaleTicket', 'pesagem-manual', ScaleTicketPesagemManualParser);
