import BigNumber from 'bignumber.js';
import { randomInt } from 'node:crypto';

export const stubBigNumber = ({
  decimals = 6,
  max = 100,
}: {
  decimals?: number;
  max?: number;
} = {}) =>
  BigNumber(randomInt(0, 1_000_000) / 1_000_000)
    .times(max)
    .decimalPlaces(decimals);
