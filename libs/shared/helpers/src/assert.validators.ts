import {
  type NonEmptyString,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';

export const assertNonEmptyString = (v: unknown): NonEmptyString =>
  NonEmptyStringSchema.parse(v);
