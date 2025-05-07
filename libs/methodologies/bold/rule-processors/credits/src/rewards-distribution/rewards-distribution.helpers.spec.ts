import { RewardsDistributionActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyActorType } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

import type {
  ActorsByActorType,
  ResultContentsWithMassIdCertificateValue,
  RewardsDistributionActor,
} from './rewards-distribution.types';

import {
  addParticipantRemainder,
  aggregateMassIdCertificatesRewards,
  calculateAmount,
  calculateCreditPercentage,
  calculateRemainder,
  formatDecimalPlaces,
  formatPercentage,
} from './rewards-distribution.helpers';

describe('Rewards Distribution Helpers', () => {
  const creditsDocumentUnitPrice = 5.23;

  describe('formatPercentage', () => {
    it('should return correct percentage divided by 100', () => {
      const percentage = formatPercentage(
        new BigNumber('13.709504'),
      ).toString();

      expect(percentage).toEqual('0.13709504');
    });

    it('should return 0 for 0 percentage', () => {
      expect(formatPercentage(new BigNumber(0)).toString()).toBe('0');
    });
  });

  describe('formatDecimalPlaces', () => {
    it('should format the number with 6 decimal places and round down', () => {
      const result = formatDecimalPlaces(
        new BigNumber('13.6898828123'),
      ).toString();

      expect(result).toEqual('13.689882');
    });

    it('should handle zero and negative numbers in formatDecimalPlaces', () => {
      expect(formatDecimalPlaces(new BigNumber(0)).toString()).toBe('0');
      expect(formatDecimalPlaces(new BigNumber('-1.2345678')).toString()).toBe(
        '-1.234567',
      );
    });
  });

  describe('calculateCreditPercentage', () => {
    it('should return the correct percentage that the participant has in the credit', () => {
      const result = formatDecimalPlaces(
        new BigNumber('13.6898828123'),
      ).toString();

      expect(result).toEqual('13.689882');
    });

    it('should return 0 if amountTotal is zero', () => {
      const result = calculateCreditPercentage(
        new BigNumber(10),
        new BigNumber(0),
      );

      expect(result).toBe('0');
    });

    it('should return 0 if amount is zero', () => {
      expect(
        calculateCreditPercentage(new BigNumber(0), new BigNumber(100)),
      ).toBe('0');
    });
  });

  describe('calculateAmount', () => {
    it('should return the correct amount of the participant', () => {
      const amount = calculateAmount({
        creditsDocumentUnitPrice,
        massIdCertificateValue: new BigNumber(1500),
        massIdPercentage: '30.1234567892',
        participantAmount: '0',
      });

      expect(amount.toString()).toEqual('2363.185185');
    });

    it('should return the correct amount of the participant when the same participant already exists', () => {
      const amount = calculateAmount({
        creditsDocumentUnitPrice,
        massIdCertificateValue: new BigNumber(1500),
        massIdPercentage: '30.1234567892',
        participantAmount: '3.223669',
      });

      expect(amount.toString()).toEqual('2366.408854');
    });

    it('should handle undefined participantAmount', () => {
      const amount = calculateAmount({
        creditsDocumentUnitPrice,
        massIdCertificateValue: new BigNumber(100),
        massIdPercentage: '10',
        participantAmount: undefined,
      });

      expect(amount).toBe('52.3');
    });
  });

  describe('calculateRemainder', () => {
    it('should return the correct remainder of the credit', () => {
      const massIdTotalValue = new BigNumber(2500);
      const actors: ActorsByActorType = new Map();

      // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle, @typescript-eslint/no-unused-vars
      for (const _iterator of Array.from({ length: 3 })) {
        actors.set(
          `${random<RewardsDistributionActorType>()}-${faker.string.uuid()}`,
          {
            ...random<RewardsDistributionActor>(),
            amount: '12.503982',
            percentage: '33.333333',
          },
        );
      }

      const { amount, percentage } = calculateRemainder({
        actors,
        creditsDocumentUnitPrice,
        massIdTotalValue,
      });

      expect(amount.toString()).toEqual('13037.488054');
      expect(percentage.toString()).toEqual('0.000001');
    });
  });

  describe('addParticipantRemainder', () => {
    it('should sum remainder value to participant amount and remainderPercentage', () => {
      const actors: ActorsByActorType = new Map();
      const remainder = {
        amount: new BigNumber('3.543984'),
        percentage: new BigNumber('0.027105'),
      };

      actors.set(MethodologyActorType.NETWORK, {
        ...random<RewardsDistributionActor>(),
        actorType: RewardsDistributionActorType.NETWORK,
        amount: '8.023876',
      });

      addParticipantRemainder({
        actors,
        remainder,
      });

      expect(actors.get(MethodologyActorType.NETWORK)).toMatchObject({
        amount: '11.56786',
      });
    });

    it('should do nothing if NETWORK actor is not present', () => {
      const actors: ActorsByActorType = new Map();

      actors.set('OTHER-1', {
        actorType: RewardsDistributionActorType.HAULER,
        amount: '1',
        participant: { id: '1', name: 'A' },
        percentage: '1',
      });
      const remainder = {
        amount: new BigNumber(5),
        percentage: new BigNumber(5),
      };

      addParticipantRemainder({ actors, remainder });
      expect(actors.get('OTHER-1')?.amount).toBe('1');
    });
  });

  describe('aggregateCertificateRewards', () => {
    it('should add amount, actorType and name to participant', () => {
      const actorsData = stubArray(
        () =>
          random<
            Omit<RewardsDistributionActor, 'actorType'> & {
              actorType: RewardsDistributionActorType;
            }
          >(),
        4,
      );

      const getActorKeyByIndex = (index: number) =>
        `${actorsData[index]?.actorType}-${actorsData[index]?.participant.id}`;

      const resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[] =
        [
          {
            massIdCertificateValue: new BigNumber(900),
            resultContent: {
              massIdDocumentId: faker.string.uuid(),
              massIdRewards: [
                {
                  actorType: actorsData[0]!.actorType,
                  massIdPercentage: '20.1234567892',
                  participant: actorsData[0]!.participant,
                },
                {
                  actorType: actorsData[1]!.actorType,
                  massIdPercentage: '79.8765432108',
                  participant: actorsData[1]!.participant,
                },
              ],
            },
          },
          {
            massIdCertificateValue: new BigNumber(900),
            resultContent: {
              massIdDocumentId: faker.string.uuid(),
              massIdRewards: [
                {
                  actorType: actorsData[2]!.actorType,
                  massIdPercentage: '32.1238731924',
                  participant: actorsData[2]!.participant,
                },
                {
                  actorType: actorsData[3]!.actorType,
                  massIdPercentage: '67.8761268076',
                  participant: actorsData[3]!.participant,
                },
              ],
            },
          },
        ];

      const { actors, massIdTotalValue } = aggregateMassIdCertificatesRewards(
        creditsDocumentUnitPrice,
        resultContentsWithMassIdCertificateValue,
      );

      expect(massIdTotalValue.toString()).toEqual('1800');

      expect(actors.get(getActorKeyByIndex(0))).toMatchObject({
        amount: '947.211111',
      });
      expect(actors.get(getActorKeyByIndex(1))).toMatchObject({
        amount: '3759.788888',
      });
      expect(actors.get(getActorKeyByIndex(2))).toMatchObject({
        amount: '1512.070711',
      });
      expect(actors.get(getActorKeyByIndex(3))).toMatchObject({
        amount: '3194.929288',
      });
    });
  });
});
