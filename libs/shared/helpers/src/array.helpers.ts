import type { NonEmptyArray } from '@carrot-fndn/shared/types';

export const isNonEmptyArray = <T>(array: unknown): array is NonEmptyArray<T> =>
  Array.isArray(array) && array.length > 0;

export const arrayOfUniqueValues = <T>(array: Array<T>): Array<T> => [
  ...new Set(array),
];
