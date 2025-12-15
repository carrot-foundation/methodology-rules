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

  const [day, month, year] = dateParts;
  const [hour, minute] = timeParts;

  if (
    day === undefined ||
    month === undefined ||
    year === undefined ||
    hour === undefined ||
    minute === undefined ||
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return undefined;
  }

  return new Date(year, month - 1, day, hour, minute);
};

export const validateWeights = (
  initialWeight?: { timestamp?: Date; unit: string; value: number },
  finalWeight?: { timestamp?: Date; unit: string; value: number },
  netWeight?: { unit: string; value: number },
): boolean | undefined => {
  if (!initialWeight || !finalWeight || !netWeight) {
    return undefined;
  }

  const calculatedNetWeight = initialWeight.value - finalWeight.value;
  const tolerance = 1;

  return Math.abs(calculatedNetWeight - netWeight.value) < tolerance;
};
