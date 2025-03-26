import type { NonNullableOrNullOrUndefined } from '@carrot-fndn/shared/types';

export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isObject(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value) as Record<string, unknown> | null;

  if (proto === null) {
    return true;
  }

  const constructor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;

  return (
    typeof constructor === 'function' &&
    constructor.toString() === Object.toString()
  );
};

export const isNonEmptyObject = (
  value: unknown,
): value is Record<string, unknown> =>
  isPlainObject(value) && Object.keys(value).length > 0;

export const pick = <T, K extends keyof T>(
  object: T,
  ...keys: K[]
): Pick<T, K> => {
  const pickedObject = {} as Pick<T, K>;

  for (const key of keys) {
    // eslint-disable-next-line security/detect-object-injection
    pickedObject[key] = object[key];
  }

  return pickedObject;
};

export const getOrDefault = <T, D extends NonNullableOrNullOrUndefined<T>>(
  value: T | null | undefined,
  defaultValue: D,
): NonNullableOrNullOrUndefined<T> => {
  if (isNil(value)) {
    return defaultValue as NonNullableOrNullOrUndefined<T>;
  }

  return value as NonNullableOrNullOrUndefined<T>;
};

export const getOrUndefined = <T>(
  value: T | null | undefined,
): NonNullable<T> | undefined => value ?? undefined;
