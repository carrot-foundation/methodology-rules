import type BigNumber from 'bignumber.js';

import {
  type Document,
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
  massIdDocument: Document;
  massIdPercentage: BigNumber;
  participant: RewardActorParticipant;
}

export type RewardsDistribution = Record<
  RewardsDistributionWasteType,
  RewardsDistributionActorTypePercentage
>;

export interface RewardsDistributionActor {
  participant: RewardActorParticipant;
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
