import { faker } from '@faker-js/faker';

import { stubArray } from './array.stubs';

export const stubObject = (): Record<string, string> =>
  Object.fromEntries(
    stubArray(() => [faker.string.nanoid(), faker.string.nanoid()]),
  );
