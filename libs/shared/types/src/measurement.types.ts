import { z } from 'zod';

export const MEASUREMENT_UNIT = {
  KG: 'kg',
} as const;

export const MeasurementUnitSchema = z.enum(
  Object.values(MEASUREMENT_UNIT) as [string, ...string[]],
);
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;
// eslint-disable-next-line no-redeclare -- intentional declaration merging: type + const share the name to preserve enum-like dot-notation
export const MeasurementUnit = MEASUREMENT_UNIT;
