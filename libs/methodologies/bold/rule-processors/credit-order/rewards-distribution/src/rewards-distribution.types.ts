import type {
  CertificateRewardDistributionOutput,
  RewardActorAddress,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type {
  MethodologyActorType,
  NonEmptyString,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

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
  actorType: MethodologyActorType.REMAINDER | RewardsDistributionActorType;
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
