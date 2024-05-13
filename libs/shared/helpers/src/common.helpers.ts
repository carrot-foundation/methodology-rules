export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

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
