import {
  type NonEmptyString,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const assertNonEmptyString = (v: unknown): NonEmptyString =>
  NonEmptyStringSchema.parse(v);

export const assertString = (v: unknown): string => z.string().parse(v);
