import type { SetNonNullable, SetRequired } from 'type-fest';

import { z } from 'zod';

const PLATE_SEPARATORS = /[-\s]/g;
const MERCOSUL_PLATE = /^[A-Z]{3}\d[A-Z]\d{2}$/;
const LEGACY_PLATE = /^[A-Z]{3}\d{4}$/;
const SHORT_PLATE = /^[A-Z]{2}\d{4}$/;

const normalizePlate = (v: string): string =>
  v.toUpperCase().replaceAll(PLATE_SEPARATORS, '');

export const LicensePlateSchema = z
  .string()
  .nonempty()
  .refine(
    (v) => {
      const plate = normalizePlate(v);

      return (
        MERCOSUL_PLATE.test(plate) ||
        LEGACY_PLATE.test(plate) ||
        SHORT_PLATE.test(plate)
      );
    },
    { message: 'Invalid license plate format' },
  );
export type LicensePlate = z.infer<typeof LicensePlateSchema>;

export type NonEmptyArray<T> = [T, ...T[]];

export type SetRequiredNonNullable<T, K extends keyof T> = SetRequired<
  SetNonNullable<T, K>,
  K
>;
