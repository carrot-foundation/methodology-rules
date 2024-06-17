import {
  type CertificateRewardDistributionOutput,
  DocumentEventActorType,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

import type {
  Actor,
  ActorsByActorType,
  ResultContentWithMassValue,
} from './rewards-distribution.types';

import {
  addParticipantRemainder,
  aggregateCertificateRewards,
  calculateAmount,
  calculateRemainder,
  formatDecimalPlaces,
  formatPercentage,
} from './rewards-distribution.helpers';

describe('Rewards Distribution Helpers', () => {
  const unitPrice = 5.23;

  describe('formatPercentage', () => {
    it('should return correct percentage divided by 100', () => {
      const percentage = formatPercentage(
        new BigNumber('13.709504'),
      ).toString();

      expect(percentage).toEqual('0.13709504');
    });
  });

  describe('formatDecimalPlaces', () => {
    it('should format the number with 6 decimal places and round down', () => {
      const result = formatDecimalPlaces(
        new BigNumber('13.6898828123'),
      ).toString();

      expect(result).toEqual('13.689882');
    });
  });

  describe('calculateCreditPercentage', () => {
    it('should return the correct percentage that the participant has in the credit', () => {
      const result = formatDecimalPlaces(
        new BigNumber('13.6898828123'),
      ).toString();

      expect(result).toEqual('13.689882');
    });
  });

  describe('calculateAmount', () => {
    it('should return the correct amount of the participant', () => {
      const massValue = new BigNumber(1500);

      const amount = calculateAmount({
        certificatePercentage: '30.1234567892',
        massValue,
        participantAmount: '0',
        unitPrice,
      });

      expect(amount.toString()).toEqual('2363.185185');
    });

    it('should return the correct amount of the participant when the same participant already exists', () => {
      const massValue = new BigNumber(1500);

      const amount = calculateAmount({
        certificatePercentage: '30.1234567892',
        massValue,
        participantAmount: '3.223669',
        unitPrice,
      });

      expect(amount.toString()).toEqual('2366.408854');
    });
  });

  describe('calculateRemainder', () => {
    it('should return the correct remainder of the credit', () => {
      const massTotalValue = new BigNumber(2500);
      const actors: ActorsByActorType = new Map();

      // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle, @typescript-eslint/no-unused-vars
      for (const _iterator of Array.from({ length: 3 })) {
        actors.set(
          `${random<RewardsDistributionActorType>()}-${faker.string.uuid()}`,
          {
            ...random<Actor>(),
            amount: '12.503982',
            percentage: '33.333333',
          },
        );
      }

      const { amount, percentage } = calculateRemainder({
        actors,
        massTotalValue,
        unitPrice,
      });

      expect(amount.toString()).toEqual('13037.488054');
      expect(percentage.toString()).toEqual('0.000001');
    });
  });

  describe('addParticipantRemainder', () => {
    it('should sum remainder value to participant amount and remainderPercentage', () => {
      const massTotalValue = new BigNumber(2500);
      const actors: ActorsByActorType = new Map();
      const remainder = {
        amount: new BigNumber('3.543984'),
        percentage: new BigNumber('0.027105'),
      };

      actors.set(DocumentEventActorType.NETWORK, {
        ...random<Actor>(),
        actorType: DocumentEventActorType.NETWORK,
        amount: '8.023876',
      });

      addParticipantRemainder({
        actors,
        massTotalValue,
        remainder,
        unitPrice,
      });

      expect(actors.get(DocumentEventActorType.NETWORK)).toMatchObject({
        amount: '11.56786',
      });
    });
  });

  describe('aggregateCertificateRewards', () => {
    it('should add amount, actorType and name to participant', () => {
      const actorsData = stubArray(
        () =>
          random<
            Omit<Actor, 'actorType'> & {
              actorType: RewardsDistributionActorType;
            }
          >(),
        4,
      );

      const getActorKeyByIndex = (index: number) =>
        `${actorsData[index]?.actorType}-${actorsData[index]?.participant.id}`;

      const resultContentsWithMassValue: ResultContentWithMassValue[] = [
        {
          massValue: new BigNumber(900),
          resultContent: {
            certificateRewards: [
              {
                actorType: actorsData[0]?.actorType,
                participant: actorsData[0]?.participant,
                percentage: '20.1234567892',
              },
              {
                actorType: actorsData[1]?.actorType,
                participant: actorsData[1]?.participant,
                percentage: '79.8765432108',
              },
            ],
          } as unknown as CertificateRewardDistributionOutput,
        },
        {
          massValue: new BigNumber(900),
          resultContent: {
            certificateRewards: [
              {
                actorType: actorsData[2]?.actorType,
                participant: actorsData[2]?.participant,
                percentage: '32.1238731924',
              },
              {
                actorType: actorsData[3]?.actorType,
                participant: actorsData[3]?.participant,
                percentage: '67.8761268076',
              },
            ],
          } as unknown as CertificateRewardDistributionOutput,
        },
      ];

      const { actors, massTotalValue } = aggregateCertificateRewards(
        unitPrice,
        resultContentsWithMassValue,
      );

      expect(massTotalValue.toString()).toEqual('1800');

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
