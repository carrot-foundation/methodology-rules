import type BigNumber from 'bignumber.js';

import {
  type BoldDocument,
  type RewardsDistributionActorAddress,
  type RewardsDistributionActorParticipant,
  type RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface ActorMassIDPercentageInputDto {
  actors: RewardsDistributionActor[];
  actorType: RewardsDistributionActorType;
  massIDDocument: BoldDocument;
  rewardDistribution: BigNumber;
  wasteGeneratorVerificationDocument: BoldDocument | undefined;
}

export interface ActorReward {
  actorType: RewardsDistributionActorType;
  address: RewardsDistributionActorAddress;
  massIDDocument: BoldDocument;
  massIDPercentage: BigNumber;
  participant: RewardsDistributionActorParticipant;
  preserveSensitiveData: boolean | undefined;
}

export type RewardsDistribution = Record<
  RewardsDistributionWasteType,
  RewardsDistributionActorTypePercentage
>;

export interface RewardsDistributionActor {
  address: RewardsDistributionActorAddress;
  participant: RewardsDistributionActorParticipant;
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
