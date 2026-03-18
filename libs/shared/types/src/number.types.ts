import { z } from 'zod';

export const LatitudeSchema = z.number().min(-90).max(90);
export type Latitude = z.infer<typeof LatitudeSchema>;

export const LongitudeSchema = z.number().min(-180).max(180);
export type Longitude = z.infer<typeof LongitudeSchema>;

export const NonNegativeFloatSchema = z.number().min(0);
export type NonNegativeFloat = z.infer<typeof NonNegativeFloatSchema>;

export const NonZeroPositiveSchema = z.number().gt(0);
export type NonZeroPositive = z.infer<typeof NonZeroPositiveSchema>;

export const NonZeroPositiveIntSchema = z.number().int().gt(0);
export type NonZeroPositiveInt = z.infer<typeof NonZeroPositiveIntSchema>;
