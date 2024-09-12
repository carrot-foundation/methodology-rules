import type { NonEmptyArray, NonEmptyString } from '@carrot-fndn/shared/types';

import type { Participant } from './participant.types';

import { DocumentEventActorType } from './enum.types';

export type RewardActorParticipant = Pick<Participant, 'id' | 'name'>;

export type RewardsDistributionActorType =
  | DocumentEventActorType.APPOINTED_NGO
  | DocumentEventActorType.HAULER
  | DocumentEventActorType.INTEGRATOR
  | DocumentEventActorType.METHODOLOGY_AUTHOR
  | DocumentEventActorType.METHODOLOGY_DEVELOPER
  | DocumentEventActorType.NETWORK
  | DocumentEventActorType.PROCESSOR
  | DocumentEventActorType.RECYCLER
  | DocumentEventActorType.SOURCE;

export interface MassReward {
  actorType: RewardsDistributionActorType;
  documentId: NonEmptyString;
  // TODO: update with custom tag to validate BigNumber string
  massCertificatePercentage: NonEmptyString;
  // TODO: update with custom tag to validate BigNumber string
  massPercentage: NonEmptyString;
  participant: RewardActorParticipant;
}

export interface CertificateReward {
  actorType: RewardsDistributionActorType;
  participant: RewardActorParticipant;
  // TODO: update with custom tag to validate BigNumber string
  percentage: NonEmptyString;
}

export interface CertificateRewardDistributionOutput {
  certificateRewards: NonEmptyArray<CertificateReward>;
  massRewards: NonEmptyArray<MassReward>;
}

export interface RewardDistributionResultContent {
  certificateRewards: NonEmptyArray<CertificateReward>;
  massRewards: NonEmptyArray<MassReward>;
}
