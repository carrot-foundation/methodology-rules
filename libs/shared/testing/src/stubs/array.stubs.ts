import { faker } from '@faker-js/faker';

export const stubArray = <T>(
  stubFunction: () => T,
  range?: number | { max?: number; min?: number },
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
