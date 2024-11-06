export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getNonEmptyString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

export const extractNumberFromString = (value: string): number => {
  let sanitized = value.replaceAll(' ', '');

  const isEuropeanFormat =
    sanitized.includes(',') && sanitized.indexOf(',') > sanitized.indexOf('.');

  sanitized = isEuropeanFormat
    ? sanitized.replaceAll('.', '').replace(',', '.')
    : sanitized.replaceAll(',', '');

  // eslint-disable-next-line security/detect-unsafe-regex
  const match = sanitized.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  const number = match ? Number(match[0]) : Number.NaN;

  if (Number.isNaN(number)) {
    throw new TypeError(`Could not extract number from ${value}`);
  }

  return number;
};
