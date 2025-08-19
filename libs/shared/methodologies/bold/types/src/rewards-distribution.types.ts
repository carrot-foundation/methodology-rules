import {
  MethodologyActorType,
  type MethodologyParticipant,
  type NonEmptyArray,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

export enum RewardsDistributionActorType {
  COMMUNITY_IMPACT_POOL = MethodologyActorType.COMMUNITY_IMPACT_POOL,
  HAULER = MethodologyActorType.HAULER,
  INTEGRATOR = MethodologyActorType.INTEGRATOR,
  METHODOLOGY_AUTHOR = MethodologyActorType.METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER = MethodologyActorType.METHODOLOGY_DEVELOPER,
  NETWORK = MethodologyActorType.NETWORK,
  PROCESSOR = MethodologyActorType.PROCESSOR,
  RECYCLER = MethodologyActorType.RECYCLER,
  WASTE_GENERATOR = MethodologyActorType.WASTE_GENERATOR,
}

export enum RewardsDistributionWasteType {
  MIXED_ORGANIC_WASTE = 'Mixed Organic Waste',
  SLUDGE_FROM_WASTE_TREATMENT = 'Sludge from Waste Treatment',
  TOBACCO_INDUSTRY_RESIDUES = 'Tobacco Industry Residues',
}

export interface CertificateReward {
  actorType: RewardsDistributionActorType;
  participant: RewardActorParticipant;
  // TODO: update with custom tag to validate BigNumber string
  percentage: NonEmptyString;
}

export type CertificateRewardDistributionOutput =
  RewardDistributionResultContent;

export interface MassIdReward {
  actorType: RewardsDistributionActorType;
  address: RewardActorAddress;
  // TODO: update with custom tag to validate BigNumber string
  massIdPercentage: NonEmptyString;
  participant: RewardActorParticipant;
}

export interface RewardActorAddress {
  id: NonEmptyString;
}

export type RewardActorParticipant = Pick<
  MethodologyParticipant,
  'id' | 'name'
>;

export interface RewardDistributionResultContent {
  massIdDocumentId: NonEmptyString;
  massIdRewards: NonEmptyArray<MassIdReward>;
}
