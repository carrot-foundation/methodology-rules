import type { SetNonNullable, SetRequired } from 'type-fest';
import { z } from 'zod';

export const LicensePlateSchema = z
  .string()
  .nonempty()
  .regex(
    /^([A-Z]{3}\d[A-Z]\d{2}|[A-Z]{3}-\d{4}|[A-Z]{2}-\d{4}|[A-Z]{3} \d{4})$/,
  );
export type LicensePlate = z.infer<typeof LicensePlateSchema>;

export type NonEmptyArray<T> = [T, ...T[]];

export type SetRequiredNonNullable<T, K extends keyof T> = SetRequired<
  SetNonNullable<T, K>,
  K
>;
