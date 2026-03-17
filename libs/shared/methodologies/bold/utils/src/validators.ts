import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';

export const validateNonEmptyString = (input: unknown) =>
  NonEmptyStringSchema.safeParse(input);
