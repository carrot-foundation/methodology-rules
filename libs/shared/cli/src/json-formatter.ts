export const formatAsJson = (value: unknown): string =>
  JSON.stringify(value, undefined, 2);
