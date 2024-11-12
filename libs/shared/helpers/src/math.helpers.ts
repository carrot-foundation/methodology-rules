import type { NonZeroPositiveInt } from '@carrot-fndn/shared/types';

import BigNumber from 'bignumber.js';

export const sumBigNumbers = (values: BigNumber[]): BigNumber => {
  let result = new BigNumber(0);

  for (const value of values) {
    result = result.plus(value);
  }

  return result;
};

export const splitBigNumberIntoParts = (
  total: BigNumber,
  partsCount: NonZeroPositiveInt,
): BigNumber[] => {
  const decimals = total.decimalPlaces() ?? 6;
  const parts = Array.from<BigNumber>({ length: partsCount }).fill(
    new BigNumber(0),
  );
  let remaining = total;

  for (let index = 0; index < partsCount - 1; index += 1) {
    const part = BigNumber(Math.random())
      .times(remaining)
      .decimalPlaces(decimals);

    parts.splice(index, 1, part);

    remaining = remaining.minus(part);
  }

  parts[partsCount - 1] = remaining;

  return parts;
};
