import { LAYOUT_1_SCALE_TICKET_PATTERNS } from './constants';
import { parseDate, parseNumber } from './helpers';

export const extractStringField = (
  text: string,
  pattern: RegExp,
): string | undefined => {
  const match = pattern.exec(text);

  return match?.[1] ?? undefined;
};

export const extractTicketNumber = (text: string): string | undefined =>
  extractStringField(text, LAYOUT_1_SCALE_TICKET_PATTERNS.ticketNumber);

export const extractVehiclePlate = (text: string): string | undefined =>
  extractStringField(text, LAYOUT_1_SCALE_TICKET_PATTERNS.vehiclePlate);

export const extractTransporter = (
  text: string,
):
  | undefined
  | {
      code: string;
      name: string;
    } => {
  const match = LAYOUT_1_SCALE_TICKET_PATTERNS.transporter.exec(text);

  if (!match || !match[1] || !match[2]) {
    return undefined;
  }

  const rawName = match[2].trim();
  const name = rawName.split('\n')[0]?.trim();

  if (!name) {
    return undefined;
  }

  return {
    code: match[1],
    name,
  };
};

export const extractNetWeight = (
  text: string,
): undefined | { unit: string; value: number } => {
  const match = LAYOUT_1_SCALE_TICKET_PATTERNS.netWeight.exec(text);

  if (!match || !match[1] || !match[2]) {
    return undefined;
  }

  const value = parseNumber(match[1]);

  if (value === undefined) {
    return undefined;
  }

  return {
    unit: match[2],
    value,
  };
};

export const extractTimestamp = (
  text: string,
  anchorPattern: RegExp,
  dateTimePattern: RegExp,
): Date | undefined => {
  const anchorMatch = anchorPattern.exec(text);

  if (!anchorMatch || !anchorMatch[0]) {
    return undefined;
  }

  const textAfterAnchor = text.slice(anchorMatch.index);
  const dateTimeMatch = dateTimePattern.exec(textAfterAnchor);

  if (!dateTimeMatch || !dateTimeMatch[1] || !dateTimeMatch[2]) {
    return undefined;
  }

  return parseDate(dateTimeMatch[1], dateTimeMatch[2]);
};

export const extractWeightWithTimestamp = (
  text: string,
  weightPattern: RegExp,
  dateTimePattern: RegExp,
): undefined | { timestamp?: Date; unit: string; value: number } => {
  const weightMatch = weightPattern.exec(text);

  if (!weightMatch || !weightMatch[1] || !weightMatch[2]) {
    return undefined;
  }

  const value = parseNumber(weightMatch[1]);

  if (value === undefined) {
    return undefined;
  }

  const timestamp = extractTimestamp(text, weightPattern, dateTimePattern);

  const result: { timestamp?: Date; unit: string; value: number } = {
    unit: weightMatch[2],
    value,
  };

  if (timestamp) {
    result.timestamp = timestamp;
  }

  return result;
};

export const extractInitialWeight = (
  text: string,
): undefined | { timestamp?: Date; unit: string; value: number } =>
  extractWeightWithTimestamp(
    text,
    LAYOUT_1_SCALE_TICKET_PATTERNS.initialWeight,
    LAYOUT_1_SCALE_TICKET_PATTERNS.initialDateTime,
  );

export const extractFinalWeight = (
  text: string,
): undefined | { timestamp?: Date; unit: string; value: number } =>
  extractWeightWithTimestamp(
    text,
    LAYOUT_1_SCALE_TICKET_PATTERNS.finalWeight,
    LAYOUT_1_SCALE_TICKET_PATTERNS.finalDateTime,
  );
