import { RewardsDistributionActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { MethodologyActorType } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';
import { random } from 'typia';

import type {
  ActorsByType,
  ResultContentsWithMassIDCertificateValue,
  RewardsDistributionActor,
} from './rewards-distribution.types';

import {
  addAmount,
  addParticipantRemainder,
  aggregateMassIDCertificatesRewards,
  calculateAbsoluteValue,
  calculateAmount,
  calculateCreditPercentage,
  calculateRemainder,
  formatDecimalPlaces,
  formatPercentage,
  getAggregateParticipantKey,
} from './rewards-distribution.helpers';

describe('Rewards Distribution Helpers', () => {
  const creditUnitPrice = new BigNumber(5.23);

  describe('getAggregateParticipantKey', () => {
    it('should return the correct key format when given valid inputs', () => {
      expect(
        getAggregateParticipantKey(
          RewardsDistributionActorType.HAULER,
          'participant-id-123',
        ),
      ).toEqual(`${RewardsDistributionActorType.HAULER}-participant-id-123`);

      expect(
        getAggregateParticipantKey('CUSTOM_TYPE', 'custom-id-456'),
      ).toEqual('CUSTOM_TYPE-custom-id-456');
    });

    it('should throw an error when actorType is undefined', () => {
      expect(() =>
        getAggregateParticipantKey(undefined, 'participant-id'),
      ).toThrow('Actor type and participant ID are required');
    });

    it('should throw an error when participantId is undefined', () => {
      expect(() =>
        getAggregateParticipantKey(
          RewardsDistributionActorType.RECYCLER,
          undefined,
        ),
      ).toThrow('Actor type and participant ID are required');
    });

    it('should throw an error when both actorType and participantId are undefined', () => {
      expect(() => getAggregateParticipantKey(undefined, undefined)).toThrow(
        'Actor type and participant ID are required',
      );
    });
  });

  describe('calculateAbsoluteValue', () => {
    it('should calculate absolute value correctly', () => {
      const result = calculateAbsoluteValue({
        massIDCertificateValue: new BigNumber(2000),
        percentage: new BigNumber(10),
      });

      expect(result).toBe('200');
    });

    it('should handle zero values correctly', () => {
      const resultZeroPercentage = calculateAbsoluteValue({
        massIDCertificateValue: new BigNumber(1000),
        percentage: new BigNumber(0),
      });

      expect(resultZeroPercentage).toBe('0');

      const resultZeroCertificateValue = calculateAbsoluteValue({
        massIDCertificateValue: new BigNumber(0),
        percentage: new BigNumber(50),
      });

      expect(resultZeroCertificateValue).toBe('0');
    });
  });

  describe('addAmount', () => {
    it('should add amounts correctly', () => {
      const result = addAmount({
        previousAmount: new BigNumber(100),
        pricePerUnit: new BigNumber(5),
        value: new BigNumber(200),
      });

      expect(result).toBe('1100');
    });

    it('should handle zero previousAmount correctly', () => {
      const result = addAmount({
        previousAmount: new BigNumber(0),
        pricePerUnit: new BigNumber(3),
        value: new BigNumber(150),
      });

      expect(result).toBe('450');
    });
  });

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

    it('should return the correct percentage that the participant has in the credit', () => {
      const result = formatDecimalPlaces(
        new BigNumber('13.6898828123'),
      ).toString();

      expect(result).toEqual('13.689882');
    });
  });

  describe('calculateCreditPercentage', () => {
    it('should return 0 if amountTotal is zero', () => {
      const result = calculateCreditPercentage({
        amount: new BigNumber(10),
        totalAmount: new BigNumber(0),
      });

      expect(result).toBe('0');
    });

    it('should return 0 if amount is zero', () => {
      expect(
        calculateCreditPercentage({
          amount: new BigNumber(0),
          totalAmount: new BigNumber(100),
        }),
      ).toBe('0');
    });
  });

  describe('calculateAmount', () => {
    it('should return the correct amount of the participant', () => {
      const amount = calculateAmount({
        creditUnitPrice,
        massIDCertificateValue: new BigNumber(1500),
        massIDPercentage: new BigNumber('30.1234567892'),
        previousParticipantAmount: new BigNumber(0),
      });

      expect(amount.toString()).toEqual('2363.185185');
    });

    it('should return the correct amount of the participant when the same participant already exists', () => {
      const amount = calculateAmount({
        creditUnitPrice,
        massIDCertificateValue: new BigNumber(1500),
        massIDPercentage: new BigNumber('30.1234567892'),
        previousParticipantAmount: new BigNumber('3.223669'),
      });

      expect(amount.toString()).toEqual('2366.408854');
    });

    it('should handle undefined participantAmount', () => {
      const amount = calculateAmount({
        creditUnitPrice,
        massIDCertificateValue: new BigNumber(100),
        massIDPercentage: new BigNumber('10'),
        previousParticipantAmount: new BigNumber(0),
      });

      expect(amount).toBe('52.3');
    });
  });

  describe('calculateRemainder', () => {
    it('should return the correct remainder of the credit', () => {
      const massIDCertificateTotalValue = new BigNumber(2500);

      const actors = new Map(
        Array.from({ length: 3 }).map(() => [
          `${random<RewardsDistributionActorType>()}-${faker.string.uuid()}`,
          {
            ...random<RewardsDistributionActor>(),
            amount: '12.503982',
            percentage: '33.333333',
          },
        ]),
      );

      const { amount, percentage } = calculateRemainder({
        actors,
        creditUnitPrice,
        massIDCertificateTotalValue,
      });

      expect(amount.toString()).toEqual('13037.488054');
      expect(percentage.toString()).toEqual('0.000001');
    });
  });

  describe('addParticipantRemainder', () => {
    it('should sum remainder amount and percentage to NETWORK participant amount and percentage', () => {
      const actors: ActorsByType = new Map();
      const remainder = {
        amount: new BigNumber('3.543984'),
        percentage: new BigNumber('0.027105'),
      };

      actors.set(MethodologyActorType.NETWORK, {
        ...random<RewardsDistributionActor>(),
        actorType: RewardsDistributionActorType.NETWORK,
        amount: '8.023876',
        percentage: '0',
      });

      addParticipantRemainder({
        actors,
        remainder,
      });

      expect(actors.get(MethodologyActorType.NETWORK)).toMatchObject({
        amount: formatDecimalPlaces(
          new BigNumber('8.023876').plus('3.543984'),
        ).toString(),
        percentage: formatDecimalPlaces(
          new BigNumber('0').plus('0.027105'),
        ).toString(),
      });
    });

    it('should do nothing if NETWORK actor is not present', () => {
      const actors: ActorsByType = new Map();

      actors.set('OTHER-1', {
        actorType: RewardsDistributionActorType.HAULER,
        address: { id: '1' },
        amount: '1',
        participant: { id: '1', name: 'A' },
        percentage: '1',
        preserveSensitiveData: false,
      });
      const remainder = {
        amount: new BigNumber(5),
        percentage: new BigNumber(5),
      };

      addParticipantRemainder({ actors, remainder });

      expect(actors.get('OTHER-1')).toMatchObject({
        amount: '1',
        percentage: '1',
      });
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
        getAggregateParticipantKey(
          actorsData[index]?.actorType,
          actorsData[index]?.participant.id,
        );

      const resultContentsWithMassIDCertificateValue: ResultContentsWithMassIDCertificateValue[] =
        [
          {
            massIDCertificateValue: new BigNumber(900),
            resultContent: {
              massIDDocumentId: faker.string.uuid(),
              massIDRewards: [
                {
                  actorType: actorsData[0]!.actorType,
                  address: actorsData[0]!.address,
                  massIDPercentage: '20.1234567892',
                  participant: actorsData[0]!.participant,
                  preserveSensitiveData: actorsData[0]!.preserveSensitiveData,
                },
                {
                  actorType: actorsData[1]!.actorType,
                  address: actorsData[1]!.address,
                  massIDPercentage: '79.8765432108',
                  participant: actorsData[1]!.participant,
                  preserveSensitiveData: actorsData[1]!.preserveSensitiveData,
                },
              ],
            },
          },
          {
            massIDCertificateValue: new BigNumber(900),
            resultContent: {
              massIDDocumentId: faker.string.uuid(),
              massIDRewards: [
                {
                  actorType: actorsData[2]!.actorType,
                  address: actorsData[2]!.address,
                  massIDPercentage: '32.1238731924',
                  participant: actorsData[2]!.participant,
                  preserveSensitiveData: actorsData[2]!.preserveSensitiveData,
                },
                {
                  actorType: actorsData[3]!.actorType,
                  address: actorsData[3]!.address,
                  massIDPercentage: '67.8761268076',
                  participant: actorsData[3]!.participant,
                  preserveSensitiveData: actorsData[3]!.preserveSensitiveData,
                },
              ],
            },
          },
        ];

      const { actors, massIDCertificateTotalValue } =
        aggregateMassIDCertificatesRewards(
          creditUnitPrice,
          resultContentsWithMassIDCertificateValue,
        );

      expect(massIDCertificateTotalValue.toString()).toEqual('1800');

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

    it('should add amount, and handle the same participants in both certificates', () => {
      const participant1 = {
        id: faker.string.uuid(),
        name: faker.company.name(),
      };
      const address1 = {
        id: faker.string.uuid(),
      };
      const participant2 = {
        id: faker.string.uuid(),
        name: faker.company.name(),
      };
      const address2 = {
        id: faker.string.uuid(),
      };

      const actorType1 = RewardsDistributionActorType.WASTE_GENERATOR;
      const actorType2 = RewardsDistributionActorType.HAULER;

      const resultContentsWithMassIDCertificateValue: ResultContentsWithMassIDCertificateValue[] =
        [
          {
            massIDCertificateValue: new BigNumber(1000),
            resultContent: {
              massIDDocumentId: faker.string.uuid(),
              massIDRewards: [
                {
                  actorType: actorType1,
                  address: address1,
                  massIDPercentage: '40',
                  participant: participant1,
                  preserveSensitiveData: false,
                },
                {
                  actorType: actorType2,
                  address: address2,
                  massIDPercentage: '60',
                  participant: participant2,
                  preserveSensitiveData: false,
                },
              ],
            },
          },
          {
            massIDCertificateValue: new BigNumber(500),
            resultContent: {
              massIDDocumentId: faker.string.uuid(),
              massIDRewards: [
                {
                  actorType: actorType1,
                  address: address1,
                  massIDPercentage: '30',
                  participant: participant1,
                  preserveSensitiveData: false,
                },
                {
                  actorType: actorType2,
                  address: address2,
                  massIDPercentage: '70',
                  participant: participant2,
                  preserveSensitiveData: false,
                },
              ],
            },
          },
        ];

      const { actors, massIDCertificateTotalValue } =
        aggregateMassIDCertificatesRewards(
          creditUnitPrice,
          resultContentsWithMassIDCertificateValue,
        );

      const expectedAmount1 = formatDecimalPlaces(
        new BigNumber('0.4')
          .multipliedBy(1000)
          .multipliedBy(creditUnitPrice)
          .plus(
            new BigNumber('0.3')
              .multipliedBy(500)
              .multipliedBy(creditUnitPrice),
          ),
      ).toString();

      const expectedAmount2 = formatDecimalPlaces(
        new BigNumber('0.6')
          .multipliedBy(1000)
          .multipliedBy(creditUnitPrice)
          .plus(
            new BigNumber('0.7')
              .multipliedBy(500)
              .multipliedBy(creditUnitPrice),
          ),
      ).toString();

      const participantType1 = getAggregateParticipantKey(
        actorType1,
        participant1.id,
      );
      const participantType2 = getAggregateParticipantKey(
        actorType2,
        participant2.id,
      );

      const expectedPercentage1 = calculateCreditPercentage({
        amount: new BigNumber(expectedAmount1),
        totalAmount: new BigNumber('7845'),
      });
      const expectedPercentage2 = calculateCreditPercentage({
        amount: new BigNumber(expectedAmount2),
        totalAmount: new BigNumber('7845'),
      });

      expect(massIDCertificateTotalValue.toString()).toEqual('1500');

      expect(actors.get(participantType1)?.amount).toEqual(expectedAmount1);
      expect(actors.get(participantType2)?.amount).toEqual(expectedAmount2);

      expect(actors.get(participantType1)?.percentage).toEqual(
        expectedPercentage1,
      );
      expect(actors.get(participantType2)?.percentage).toEqual(
        expectedPercentage2,
      );

      expect(actors.get(participantType1)?.participant).toEqual(participant1);
      expect(actors.get(participantType1)?.address).toEqual(address1);
      expect(actors.get(participantType2)?.participant).toEqual(participant2);
      expect(actors.get(participantType2)?.address).toEqual(address2);

      expect(actors.get(participantType1)?.actorType).toEqual(actorType1);
      expect(actors.get(participantType2)?.actorType).toEqual(actorType2);
    });
  });
});
