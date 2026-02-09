import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

import {
  calculateMatchScore,
  createHighConfidenceField,
  type DocumentParser,
  type ExtractionOutput,
  extractStringField,
  finalizeExtraction,
  parseBrazilianNumber,
  registerParser,
} from '@carrot-fndn/shared/document-extractor';

import type {
  ScaleTicketExtractedData,
  TransporterData,
  WeightData,
} from './scale-ticket.types';

const LAYOUT_1_PATTERNS = {
  finalDateTime: /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
  finalWeight: /Pesagem Final:\s*([\d.,]+)\s*(kg)/i,
  initialDateTime: /Data \/ Hora:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/,
  initialWeight: /Pesagem Inicial:\s*([\d.,]+)\s*(kg)/i,
  netWeight: /Peso L[ií]quido:\s*([\d.,]+)\s*(kg)/i,
  ticketNumber: /Ticket de pesagem\s+(\d+)/i,
  // eslint-disable-next-line sonarjs/slow-regex
  transporter: /Transportadora:\s*(\d+)\s*-?\s*([\s\S]+?)(?=Peso|$)/i,
  vehiclePlate: /Placa Ve[ií]culo\s+([A-Z0-9]+)/i,
} as const;

const SIGNATURE_PATTERNS = [
  /Ticket de pesagem/i,
  /Peso L[ií]quido/i,
  /Pesagem/i,
  /kg/i,
];

const REQUIRED_FIELDS = ['netWeight'] as const;
const ALL_FIELDS = [
  'netWeight',
  'ticketNumber',
  'vehiclePlate',
  'transporter',
  'initialWeight',
  'finalWeight',
] as const;

const parseDate = (
  dateString: string,
  timeString: string,
): Date | undefined => {
  const [day, month, year] = dateString.split('/');
  const [hours, minutes] = timeString.split(':');

  // istanbul ignore next -- defensive check; regex ensures valid format
  if (!day || !month || !year || !hours || !minutes) {
    return undefined;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
  );

  // istanbul ignore next -- defensive check; JS Date rolls over invalid values
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const extractTimestamp = (
  text: string,
  anchorPattern: RegExp,
  dateTimePattern: RegExp,
): Date | undefined => {
  const anchorMatch = anchorPattern.exec(text);

  // istanbul ignore next -- defensive check; called after weight pattern matched
  if (!anchorMatch?.[0]) {
    return undefined;
  }

  const textAfterAnchor = text.slice(anchorMatch.index);
  const dateTimeMatch = dateTimePattern.exec(textAfterAnchor);

  if (!dateTimeMatch?.[1] || !dateTimeMatch[2]) {
    return undefined;
  }

  return parseDate(dateTimeMatch[1], dateTimeMatch[2]);
};

const extractWeightWithTimestamp = (
  text: string,
  weightPattern: RegExp,
  dateTimePattern: RegExp,
): undefined | { rawMatch: string; value: WeightData } => {
  const weightMatch = weightPattern.exec(text);

  if (!weightMatch?.[1] || !weightMatch[2]) {
    return undefined;
  }

  const numericValue = parseBrazilianNumber(weightMatch[1]);

  if (numericValue === undefined) {
    return undefined;
  }

  const timestamp = extractTimestamp(text, weightPattern, dateTimePattern);
  const value: WeightData = {
    unit: weightMatch[2] as NonEmptyString,
    value: numericValue,
  };

  if (timestamp) {
    value.timestamp = timestamp;
  }

  return { rawMatch: weightMatch[0], value };
};

const extractNetWeight = (
  text: string,
): undefined | { rawMatch: string; value: WeightData } => {
  const match = LAYOUT_1_PATTERNS.netWeight.exec(text);

  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  const numericValue = parseBrazilianNumber(match[1]);

  if (numericValue === undefined) {
    return undefined;
  }

  return {
    rawMatch: match[0],
    value: {
      unit: match[2] as NonEmptyString,
      value: numericValue,
    },
  };
};

const extractTransporter = (
  text: string,
): undefined | { rawMatch: string; value: TransporterData } => {
  const match = LAYOUT_1_PATTERNS.transporter.exec(text);

  if (!match?.[1] || !match[2]) {
    return undefined;
  }

  const rawName = match[2].trim();
  const name = rawName.split('\n')[0]?.trim();

  if (!name) {
    return undefined;
  }

  return {
    rawMatch: match[0],
    value: {
      code: match[1] as NonEmptyString,
      name: name as NonEmptyString,
    },
  };
};

export class ScaleTicketLayout1Parser
  implements DocumentParser<ScaleTicketExtractedData>
{
  readonly documentType = 'scaleTicket' as const;
  readonly layoutId = 'layout-1';
  readonly textractMode = 'detect' as const;

  getMatchScore(extractionResult: TextExtractionResult): number {
    return calculateMatchScore(extractionResult.rawText, SIGNATURE_PATTERNS);
  }

  parse(
    extractionResult: TextExtractionResult,
  ): ExtractionOutput<ScaleTicketExtractedData> {
    const { rawText } = extractionResult;
    const matchScore = this.getMatchScore(extractionResult);

    const netWeightExtracted = extractNetWeight(rawText);
    const ticketNumberExtracted = extractStringField(
      rawText,
      LAYOUT_1_PATTERNS.ticketNumber,
    );
    const vehiclePlateExtracted = extractStringField(
      rawText,
      LAYOUT_1_PATTERNS.vehiclePlate,
    );
    const transporterExtracted = extractTransporter(rawText);
    const initialWeightExtracted = extractWeightWithTimestamp(
      rawText,
      LAYOUT_1_PATTERNS.initialWeight,
      LAYOUT_1_PATTERNS.initialDateTime,
    );
    const finalWeightExtracted = extractWeightWithTimestamp(
      rawText,
      LAYOUT_1_PATTERNS.finalWeight,
      LAYOUT_1_PATTERNS.finalDateTime,
    );

    const partialData: Partial<ScaleTicketExtractedData> = {
      documentType: 'scaleTicket',
      rawText,
    };

    if (netWeightExtracted) {
      partialData.netWeight = createHighConfidenceField(
        netWeightExtracted.value,
        netWeightExtracted.rawMatch,
      );
    }

    if (ticketNumberExtracted) {
      partialData.ticketNumber = createHighConfidenceField(
        ticketNumberExtracted.value as NonEmptyString,
        ticketNumberExtracted.rawMatch,
      );
    }

    if (vehiclePlateExtracted) {
      partialData.vehiclePlate = createHighConfidenceField(
        vehiclePlateExtracted.value as NonEmptyString,
        vehiclePlateExtracted.rawMatch,
      );
    }

    if (transporterExtracted) {
      partialData.transporter = createHighConfidenceField(
        transporterExtracted.value,
        transporterExtracted.rawMatch,
      );
    }

    if (initialWeightExtracted) {
      partialData.initialWeight = createHighConfidenceField(
        initialWeightExtracted.value,
        initialWeightExtracted.rawMatch,
      );
    }

    if (finalWeightExtracted) {
      partialData.finalWeight = createHighConfidenceField(
        finalWeightExtracted.value,
        finalWeightExtracted.rawMatch,
      );
    }

    return finalizeExtraction<ScaleTicketExtractedData>({
      allFields: [...ALL_FIELDS],
      confidenceFields: [
        partialData.netWeight,
        partialData.ticketNumber,
        partialData.vehiclePlate,
        partialData.transporter,
        partialData.initialWeight,
        partialData.finalWeight,
      ],
      documentType: 'scaleTicket',
      matchScore,
      partialData,
      rawText,
      requiredFields: [...REQUIRED_FIELDS],
    });
  }
}

registerParser('scaleTicket', 'layout-1', ScaleTicketLayout1Parser);
