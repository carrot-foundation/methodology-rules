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

  for (const actor of actors) {
    const amount = new BigNumber(actor.amount);
    const percentage = new BigNumber(actor.percentage);

    expect(amount.toNumber()).toBeGreaterThanOrEqual(0);
    expect(amount.decimalPlaces()).toBeLessThanOrEqual(AMOUNT_DECIMALS);

    expect(percentage.toNumber()).toBeGreaterThanOrEqual(0);
    expect(percentage.decimalPlaces()).toBeLessThanOrEqual(PERCENTAGE_DECIMALS);

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
