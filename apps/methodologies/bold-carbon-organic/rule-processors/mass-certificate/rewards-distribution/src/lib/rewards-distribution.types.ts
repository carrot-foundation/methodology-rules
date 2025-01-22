import type BigNumber from 'bignumber.js';

import {
  type Document,
  type DocumentSubtype,
  type RewardActorParticipant,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

export interface RewardsDistributionActor {
  participant: RewardActorParticipant;
  type: RewardsDistributionActorType;
}

export interface ActorReward {
  actorType: RewardsDistributionActorType;
  document: Document;
  massCertificatePercentage: BigNumber;
  massPercentage: BigNumber;
  participant: RewardActorParticipant;
}

export type RewardsDistributionType =
  | 'FOOD_WASTE'
  | 'OTHER_ORGANIC_WASTE'
  | 'SLUDGE';

export type RewardsDistributionTypeByDocumentSubtype = Record<
  keyof DocumentSubtype,
  RewardsDistributionType | undefined
>;

export type RewardsDistributionActorTypePercentage = Record<
  RewardsDistributionActorType,
  BigNumber
>;

export type RewardsDistribution = Record<
  RewardsDistributionType,
  RewardsDistributionActorTypePercentage
>;

export interface ActorMassPercentageInputDto {
  actorType: RewardsDistributionActorType;
  actors: RewardsDistributionActor[];
  document: Document;
  rewardDistribution: BigNumber;
}
