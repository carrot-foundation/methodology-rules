import type BigNumber from 'bignumber.js';

import {
  type Document,
  type RewardActorParticipant,
  type RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface RewardsDistributionActor {
  participant: RewardActorParticipant;
  type: RewardsDistributionActorType;
}

export interface ActorReward {
  actorType: RewardsDistributionActorType;
  massIdDocument: Document;
  massIdPercentage: BigNumber;
  participant: RewardActorParticipant;
}

export type RewardsDistributionActorTypePercentage = Record<
  RewardsDistributionActorType,
  BigNumber
>;

export type RewardsDistribution = Record<
  RewardsDistributionWasteType,
  RewardsDistributionActorTypePercentage
>;

export interface ActorMassIdPercentageInputDto {
  actorType: RewardsDistributionActorType;
  actors: RewardsDistributionActor[];
  massIdDocument: Document;
  rewardDistribution: BigNumber;
}

export interface UnidentifiedWasteCalculationDto {
  actorType: RewardsDistributionActorType;
  actors: RewardsDistributionActor[];
  additionalPercentage: BigNumber;
  basePercentage: BigNumber;
  rewardDistributions: RewardsDistributionActorTypePercentage;
  wasteGeneratorPercentage: BigNumber;
}
