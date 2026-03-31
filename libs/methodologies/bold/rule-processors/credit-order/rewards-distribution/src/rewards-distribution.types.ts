import type {
  CertificateRewardDistributionOutput,
  RewardActorAddress,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type BigNumber from 'bignumber.js';

import { ActorType, type NonEmptyString } from '@carrot-fndn/shared/types';

export type ActorsByType = Map<string, RewardsDistributionActor>;

export interface AggregateMassIDCertificateRewards {
  actors: ActorsByType;
  massIDCertificateTotalValue: BigNumber;
}

export interface Participant {
  id: NonEmptyString;
  name: NonEmptyString;
}

export interface Remainder<T = BigNumber> {
  amount: T;
  percentage: T;
}

export interface ResultContentsWithMassIDCertificateValue {
  massIDCertificateValue: BigNumber;
  resultContent: CertificateRewardDistributionOutput;
}

export interface RewardsDistribution {
  actors: RewardsDistributionActor[];
  creditUnitPrice: NonEmptyString;
  massIDCertificateTotalValue: NonEmptyString;
  remainder: Remainder<string>;
}

export interface RewardsDistributionActor {
  actorType: (typeof ActorType)['REMAINDER'] | RewardsDistributionActorType;
  address: RewardActorAddress;
  amount: NonEmptyString;
  participant: Participant;
  percentage: NonEmptyString;
  preserveSensitiveData: boolean | undefined;
}

export interface RuleSubject {
  creditUnitPrice: BigNumber;
  resultContentsWithMassIDCertificateValue: ResultContentsWithMassIDCertificateValue[];
}
