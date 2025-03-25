import type {
  LicensePlate,
  NonZeroPositive,
  NonZeroPositiveInt,
  Uri,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

import { createIs } from 'typia';

export const isNonZeroPositive = createIs<NonZeroPositive>();
export const isNonZeroPositiveInt = createIs<NonZeroPositiveInt>();
export const isNumber = createIs<number>();
export const isUri = createIs<Uri>();
export const isBigNumber = createIs<BigNumber>();
export const isValidLicensePlate = createIs<LicensePlate>();
