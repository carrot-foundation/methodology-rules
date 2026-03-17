import type { SetNonNullable, SetRequired } from 'type-fest';

import { z } from 'zod';

const MERCOSUL_PLATE = /^[A-Z]{3}\d[A-Z]\d{2}$/;
const LEGACY_PLATE_DASH_4 = /^[A-Z]{3}-\d{4}$/;
const SHORT_PLATE_DASH_4 = /^[A-Z]{2}-\d{4}$/;
const LEGACY_PLATE_SPACE_4 = /^[A-Z]{3} \d{4}$/;

export const LicensePlateSchema = z
  .string()
  .nonempty()
  .refine(
    (v) =>
      MERCOSUL_PLATE.test(v) ||
      LEGACY_PLATE_DASH_4.test(v) ||
      SHORT_PLATE_DASH_4.test(v) ||
      LEGACY_PLATE_SPACE_4.test(v),
    { message: 'Invalid license plate format' },
  );
export type LicensePlate = z.infer<typeof LicensePlateSchema>;

export type NonEmptyArray<T> = [T, ...T[]];

export type SetRequiredNonNullable<T, K extends keyof T> = SetRequired<
  SetNonNullable<T, K>,
  K
>;
