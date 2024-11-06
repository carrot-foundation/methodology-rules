export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getNonEmptyString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

export const extractNumberFromString = (value: string): number => {
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = value.replace(',', '').match(/-?\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : Number.NaN;

  if (Number.isNaN(number)) {
    throw new TypeError(`Could not extract number from ${value}`);
  }

  return number;
};
