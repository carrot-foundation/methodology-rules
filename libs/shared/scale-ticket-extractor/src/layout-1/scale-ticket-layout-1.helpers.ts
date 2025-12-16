import { isValid, parse } from 'date-fns';

export const parseNumber = (value: string): number | undefined => {
  const cleaned = value.replaceAll('.', '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
};

export const parseDate = (
  dateString: string,
  timeString: string,
): Date | undefined => {
  const parsed = parse(
    `${dateString} ${timeString}`,
    'dd/MM/yyyy HH:mm',
    new Date(),
  );

  if (!isValid(parsed)) {
    return undefined;
  }

  return parsed;
};

const WEIGHT_VALIDATION_TOLERANCE = 1;

export const validateWeights = (
  initialWeight?: { timestamp?: Date; unit: string; value: number },
  finalWeight?: { timestamp?: Date; unit: string; value: number },
  netWeight?: { unit: string; value: number },
): boolean | undefined => {
  if (!initialWeight || !finalWeight || !netWeight) {
    return undefined;
  }

  if (
    initialWeight.unit !== finalWeight.unit ||
    initialWeight.unit !== netWeight.unit
  ) {
    return undefined;
  }

  const calculatedNetWeight = initialWeight.value - finalWeight.value;

  return (
    Math.abs(calculatedNetWeight - netWeight.value) <
    WEIGHT_VALIDATION_TOLERANCE
  );
};
