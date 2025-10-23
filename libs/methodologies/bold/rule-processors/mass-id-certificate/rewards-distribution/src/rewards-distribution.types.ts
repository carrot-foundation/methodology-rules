import type BigNumber from 'bignumber.js';

import {
  type Document,
  RewardActorAddress,
  type RewardActorParticipant,
  type RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface ActorMassIdPercentageInputDto {
  actors: RewardsDistributionActor[];
  actorType: RewardsDistributionActorType;
  massIdDocument: Document;
  rewardDistribution: BigNumber;
}

export interface ActorReward {
  actorType: RewardsDistributionActorType;
  address: RewardActorAddress;
  massIdDocument: Document;
  massIdPercentage: BigNumber;
  participant: RewardActorParticipant;
  preserveSensitiveData: boolean | undefined;
}

export type RewardsDistribution = Record<
  RewardsDistributionWasteType,
  RewardsDistributionActorTypePercentage
>;

export interface RewardsDistributionActor {
  address: RewardActorAddress;
  participant: RewardActorParticipant;
  preserveSensitiveData: boolean | undefined;
  type: RewardsDistributionActorType;
}

export type RewardsDistributionActorTypePercentage = Record<
  RewardsDistributionActorType,
  BigNumber
>;

export interface UnidentifiedWasteCalculationDto {
  actors: RewardsDistributionActor[];
  actorType: RewardsDistributionActorType;
  additionalPercentage: BigNumber;
  basePercentage: BigNumber;
  rewardDistributions: RewardsDistributionActorTypePercentage;
  wasteGeneratorPercentage: BigNumber;
}
