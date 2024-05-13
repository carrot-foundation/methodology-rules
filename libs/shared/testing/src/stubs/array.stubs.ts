import { faker } from '@faker-js/faker';

export const stubArray = <T>(
  stubFunction: () => T,
  range?: { max?: number; min?: number } | number,
): T[] =>
  Array.from(
    {
      length:
        typeof range === 'number'
          ? range
          : faker.number.int({
              max: range?.max ?? 5,
              min: range?.min ?? 1,
            }),
    },
    stubFunction,
  );

export const stubStringArray = (min = 1, max = 5): string[] =>
  stubArray(() => faker.string.nanoid(), { max, min });
