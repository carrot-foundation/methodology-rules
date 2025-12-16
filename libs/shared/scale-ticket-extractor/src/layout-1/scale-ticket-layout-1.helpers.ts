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
