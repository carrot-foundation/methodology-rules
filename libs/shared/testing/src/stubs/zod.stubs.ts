import type { z } from 'zod';

import { zocker } from 'zocker';

export const createStubFromSchema = <T extends z.ZodType>(
  schema: T,
  overrides?: Partial<z.infer<T>>,
): z.infer<T> => {
  const generated = zocker(schema).generate() as z.infer<T>;

  if (
    overrides &&
    typeof generated === 'object' &&
    generated != null &&
    !Array.isArray(generated)
  ) {
    return { ...generated, ...overrides } as z.infer<T>;
  }

  if (overrides && Array.isArray(generated)) {
    if (!Array.isArray(overrides)) {
      throw new TypeError(
        'createStubFromSchema: schema generates an array but overrides is not an array',
      );
    }

    return overrides as z.infer<T>;
  }

  return generated;
};
