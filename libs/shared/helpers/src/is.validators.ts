import {
  type LicensePlate,
  LicensePlateSchema,
  type NonNegativeFloat,
  NonNegativeFloatSchema,
  type NonZeroPositive,
  type NonZeroPositiveInt,
  NonZeroPositiveIntSchema,
  NonZeroPositiveSchema,
  type Uri,
  UriSchema,
} from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

export const isNonNegative = (v: unknown): v is NonNegativeFloat =>
  NonNegativeFloatSchema.safeParse(v).success;

export const isNonZeroPositive = (v: unknown): v is NonZeroPositive =>
  NonZeroPositiveSchema.safeParse(v).success;

export const isNonZeroPositiveInt = (v: unknown): v is NonZeroPositiveInt =>
  NonZeroPositiveIntSchema.safeParse(v).success;

export const isNumber = (v: unknown): v is number =>
  z.number().safeParse(v).success;

export const isUri = (v: unknown): v is Uri => UriSchema.safeParse(v).success;

export const isBigNumber = (v: unknown): v is BigNumber =>
  v instanceof BigNumber;

export const isValidLicensePlate = (v: unknown): v is LicensePlate =>
  LicensePlateSchema.safeParse(v).success;
