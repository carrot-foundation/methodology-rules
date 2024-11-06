export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getNonEmptyString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

export const extractNumberFromString = (value: string): number => {
  const number = Number(value.replace(',', '').split(' ')[0]);

  if (Number.isNaN(number)) {
    throw new TypeError(`Could not extract number from ${value}`);
  }

  return number;
};
