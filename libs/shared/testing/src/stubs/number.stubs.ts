import BigNumber from 'bignumber.js';

export const stubBigNumber = ({
  decimals = 6,
  max = 100,
}: {
  decimals?: number;
  max?: number;
} = {}) => BigNumber(Math.random()).times(max).decimalPlaces(decimals);
