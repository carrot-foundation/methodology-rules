import type { NonEmptyArray } from '@carrot-fndn/shared/types';

import {
  type CertificateReward,
  DocumentEventActorType,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/types';
import { splitBigNumberIntoParts } from '@carrot-fndn/shared/helpers';
import { stubBigNumber } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random, validate } from 'typia';

import type {
  Participant,
  ResultContentWithMassValue,
  RewardsDistribution,
} from './rewards-distribution.types';

import {
  AMOUNT_DECIMALS,
  PERCENTAGE_DECIMALS,
  calculateRewardsDistribution,
  formatPercentage,
  roundAmount,
} from './rewards-distribution.helpers';
import { stubUnitPrice } from './rewards-distribution.stubs';
import { assertExpectedRewardsDistribution } from './rewards-distribution.test.helpers';

describe('Rewards Distribution Helpers', () => {
  describe('formatPercentage', () => {
    it(`should return correct percentage divided by 100 and rounded to ${PERCENTAGE_DECIMALS} decimals`, () => {
      const value = stubBigNumber();
      const totalValue = value.plus(stubBigNumber());

      const percentage = formatPercentage(value, totalValue);

      expect(Number(percentage)).toBeLessThan(100);
      expect(BigNumber(percentage).decimalPlaces()).toBe(PERCENTAGE_DECIMALS);
    });
  });

  describe('roundAmount', () => {
    it(`should format the number with ${AMOUNT_DECIMALS} decimal places and round down`, () => {
      const result = roundAmount(new BigNumber('13.6898828123'));

      expect(result.toString()).toBe('13.689882');
      expect(result.decimalPlaces()).toBe(AMOUNT_DECIMALS);
    });
  });

  describe('calculateRewardsDistribution', () => {
    it('should throw error if two different NETWORK actors are present', () => {
      expect(() =>
        calculateRewardsDistribution(faker.number.float(), [
          {
            massValue: stubBigNumber(),
            resultContent: {
              certificateRewards: [
                random<Participant>(),
                random<Participant>(),
              ].map((participant) => ({
                actorType: DocumentEventActorType.NETWORK,
                participant,
                percentage: '50',
              })) as never,
              massRewards: [] as never,
            },
          },
        ]),
      ).toThrow('Can only have one network actor');
    });

    it('should not throw error if two same NETWORK actors are present', () => {
      const actor = {
        actorType: DocumentEventActorType.NETWORK,
        participant: random<Participant>(),
        percentage: '50',
      };
      const result = calculateRewardsDistribution(faker.number.float(), [
        {
          massValue: stubBigNumber(),
          resultContent: {
            certificateRewards: [actor, actor] as never,
            massRewards: [] as never,
          },
        },
      ]);

      expect(validate<RewardsDistribution>(result).errors).toEqual([]);
    });

    it('should throw error if NETWORK actors are not present', () => {
      expect(() =>
        calculateRewardsDistribution(faker.number.float(), []),
      ).toThrow('Network actor not found');
    });

    it('should correctly calculate the rewards distribution', () => {
      const unitPrice = stubUnitPrice();
      const actorTypes: NonEmptyArray<RewardsDistributionActorType> = [
        DocumentEventActorType.APPOINTED_NGO,
        DocumentEventActorType.HAULER,
        DocumentEventActorType.INTEGRATOR,
        DocumentEventActorType.METHODOLOGY_AUTHOR,
        DocumentEventActorType.METHODOLOGY_DEVELOPER,
        DocumentEventActorType.NETWORK,
        DocumentEventActorType.PROCESSOR,
        DocumentEventActorType.RECYCLER,
        DocumentEventActorType.SOURCE,
      ];

      const participants: Record<RewardsDistributionActorType, Participant> =
        Object.fromEntries(
          actorTypes.map((actorType) => [actorType, random<Participant>()]),
        ) as never;

      const resultContentsWithMassValue: ResultContentWithMassValue[] = [];
      const certificatesMassValue = [stubBigNumber(), stubBigNumber()];

      for (const massValue of certificatesMassValue) {
        const percentages = splitBigNumberIntoParts(
          new BigNumber(100),
          actorTypes.length,
        );

        const certificateRewards: CertificateReward[] = actorTypes.map(
          (actorType, index) => {
            const percentage = percentages[index]!;

            return {
              actorType,
              participant: participants[actorType],
              percentage: percentage.toString(),
            };
          },
        );

        resultContentsWithMassValue.push({
          massValue,
          resultContent: {
            certificateRewards: certificateRewards as never,
            massRewards: [] as never,
          },
        });
      }

      const result = calculateRewardsDistribution(
        unitPrice,
        resultContentsWithMassValue,
      );

      expect(result.actors.length).toBe(actorTypes.length);
      assertExpectedRewardsDistribution(unitPrice, result);
    });
  });
});
