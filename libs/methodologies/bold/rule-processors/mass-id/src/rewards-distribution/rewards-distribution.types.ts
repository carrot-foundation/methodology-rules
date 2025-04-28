import type BigNumber from 'bignumber.js';

import {
  type Document,
  type RewardActorParticipant,
  type RewardsDistributionActorType,
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

export enum RewardsDistributionWasteType {
  MIXED_ORGANIC_WASTE = 'Mixed Organic Waste',
  SLUDGE_FROM_WASTE_TREATMENT = 'Sludge from Waste Treatment',
  TOBACCO_INDUSTRY_RESIDUES = 'Tobacco Industry Residues',
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
