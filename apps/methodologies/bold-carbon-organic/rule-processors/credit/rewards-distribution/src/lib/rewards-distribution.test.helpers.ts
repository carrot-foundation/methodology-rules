import BigNumber from 'bignumber.js';
import { validate } from 'typia';

import type { RewardsDistribution } from './rewards-distribution.types';

import {
  AMOUNT_DECIMALS,
  PERCENTAGE_DECIMALS,
  roundAmount,
} from './rewards-distribution.helpers';

const PERCENTAGE_TOLERANCE = 0.000_001;

/* istanbul ignore next */
export const assertExpectedRewardsDistribution = (
  unitPrice: number,
  rewardsDistribution: RewardsDistribution,
) => {
  const { actors, massTotalValue, remainder } = rewardsDistribution;

  expect(validate<RewardsDistribution>(rewardsDistribution).success).toBe(true);

  const remainderPercentage = new BigNumber(remainder.percentage);
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
  ).toBeLessThan(PERCENTAGE_TOLERANCE);
  expect(remainderPercentage.decimalPlaces()).toBeLessThanOrEqual(
    PERCENTAGE_DECIMALS,
  );
  expect(remainderPercentage.toNumber()).toBeGreaterThanOrEqual(0);
};
