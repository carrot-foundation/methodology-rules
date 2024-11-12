import BigNumber from 'bignumber.js';
import { validate } from 'typia';

import type { RewardsDistribution } from './rewards-distribution.types';

import {
  AMOUNT_DECIMALS,
  PERCENTAGE_DECIMALS,
  roundAmount,
} from './rewards-distribution.helpers';

/* istanbul ignore next */
export const assertExpectedRewardsDistribution = (
  unitPrice: number,
  rewardsDistribution: RewardsDistribution,
) => {
  const { actors, massTotalValue, remainder } = rewardsDistribution;

  expect(validate<RewardsDistribution>(rewardsDistribution).errors).toEqual([]);

  const totalAmount = roundAmount(
    new BigNumber(massTotalValue).times(unitPrice),
  ).toString();

  let resultTotalAmount = new BigNumber(0);
  let resultTotalPercentage = new BigNumber(0);

  for (const { amount, percentage } of actors) {
    expect(new BigNumber(amount).decimalPlaces()).toBeLessThanOrEqual(
      AMOUNT_DECIMALS,
    );
    expect(new BigNumber(percentage).decimalPlaces()).toBeLessThanOrEqual(
      PERCENTAGE_DECIMALS,
    );

    resultTotalAmount = resultTotalAmount.plus(amount);
    resultTotalPercentage = resultTotalPercentage.plus(percentage);
  }

  expect(resultTotalAmount.decimalPlaces()).toBeLessThanOrEqual(
    AMOUNT_DECIMALS,
  );
  expect(resultTotalAmount.toString()).toBe(totalAmount);

  expect(
    new BigNumber(100).minus(resultTotalPercentage).toNumber(),
  ).toBeLessThan(0.001);
  expect(
    new BigNumber(remainder.percentage).decimalPlaces(),
  ).toBeLessThanOrEqual(PERCENTAGE_DECIMALS);
};
