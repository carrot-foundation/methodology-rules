import BigNumber from 'bignumber.js';

export const sumBigNumbers = (values: BigNumber[]): BigNumber => {
  let result = new BigNumber(0);

  for (const value of values) {
    result = result.plus(value);
  }

  return result;
};
