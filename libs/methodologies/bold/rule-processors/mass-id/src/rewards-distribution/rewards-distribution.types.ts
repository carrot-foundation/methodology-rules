import type BigNumber from 'bignumber.js';

import {
  type Document,
  type DocumentSubtype,
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

export type RewardsDistributionType =
  | 'FOOD_WASTE'
  | 'OTHER_ORGANIC_WASTE'
  | 'SLUDGE';

export enum RewardsDistributionWasteType {
  MIXED_ORGANIC_WASTE = 'Mixed Organic Waste',
  SLUDGE_FROM_WASTE_TREATMENT = 'Sludge from Waste Treatment',
  TOBACCO_INDUSTRY_RESIDUES = 'Tobacco Industry Residues',
}

export type RewardsDistributionTypeByDocumentSubtype = Record<
  keyof DocumentSubtype,
  RewardsDistributionType | undefined
>;

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
