import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import {
  CertificateRewardSchema,
  MassIDRewardSchema,
  RewardActorAddressSchema,
  RewardActorParticipantSchema,
  RewardDistributionResultContentSchema,
  RewardsDistributionActorType,
} from './rewards-distribution.types';

const validParticipant = createStubFromSchema(RewardActorParticipantSchema);

const validAddress = createStubFromSchema(RewardActorAddressSchema);

describe('CertificateRewardSchema', () => {
  const validCertificateReward = {
    actorType: RewardsDistributionActorType.HAULER,
    participant: validParticipant,
    percentage: '25.5',
  };

  it('should accept all valid actor types', () => {
    for (const actorType of Object.values(RewardsDistributionActorType)) {
      const result = CertificateRewardSchema.safeParse({
        ...validCertificateReward,
        actorType,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid actor type', () => {
    expect(
      CertificateRewardSchema.safeParse({
        ...validCertificateReward,
        actorType: 'INVALID_TYPE',
      }).success,
    ).toBe(false);
  });

  it('should reject invalid BigNumber percentage', () => {
    expect(
      CertificateRewardSchema.safeParse({
        ...validCertificateReward,
        percentage: 'not-a-number',
      }).success,
    ).toBe(false);
  });
});

describe('MassIDRewardSchema', () => {
  const validMassIDReward = {
    actorType: RewardsDistributionActorType.RECYCLER,
    address: validAddress,
    massIDPercentage: '50.123',
    participant: validParticipant,
  };

  it('should accept scientific notation for BigNumber', () => {
    expect(
      MassIDRewardSchema.safeParse({
        ...validMassIDReward,
        massIDPercentage: '1e5',
      }).success,
    ).toBe(true);
  });

  it('should reject NaN for BigNumber', () => {
    expect(
      MassIDRewardSchema.safeParse({
        ...validMassIDReward,
        massIDPercentage: 'NaN',
      }).success,
    ).toBe(false);
  });

  it('should accept without optional preserveSensitiveData', () => {
    expect(MassIDRewardSchema.safeParse(validMassIDReward).success).toBe(true);
  });
});

describe('RewardDistributionResultContentSchema', () => {
  const validResultContent = {
    massIDDocumentId: 'doc-123',
    massIDRewards: [
      {
        actorType: RewardsDistributionActorType.HAULER,
        address: validAddress,
        massIDPercentage: '100',
        participant: validParticipant,
      },
    ],
  };

  it('should reject empty massIDRewards array', () => {
    expect(
      RewardDistributionResultContentSchema.safeParse({
        ...validResultContent,
        massIDRewards: [],
      }).success,
    ).toBe(false);
  });

  it('should reject empty massIDDocumentId', () => {
    expect(
      RewardDistributionResultContentSchema.safeParse({
        ...validResultContent,
        massIDDocumentId: '',
      }).success,
    ).toBe(false);
  });
});
