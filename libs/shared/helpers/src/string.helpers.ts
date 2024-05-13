export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getNonEmptyString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;
