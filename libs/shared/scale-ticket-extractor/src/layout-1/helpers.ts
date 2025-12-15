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
  const dateParts = dateString.split('/').map(Number);
  const timeParts = timeString.split(':').map(Number);

  if (dateParts.length !== 3 || timeParts.length !== 2) {
    return undefined;
  }

  const [day, month, year] = dateParts as [number, number, number];
  const [hour, minute] = timeParts as [number, number];

  if ([day, month, year, hour, minute].some((value) => Number.isNaN(value))) {
    return undefined;
  }

  return new Date(year, month - 1, day, hour, minute);
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

  const calculatedNetWeight = initialWeight.value - finalWeight.value;

  return (
    Math.abs(calculatedNetWeight - netWeight.value) <
    WEIGHT_VALIDATION_TOLERANCE
  );
};
