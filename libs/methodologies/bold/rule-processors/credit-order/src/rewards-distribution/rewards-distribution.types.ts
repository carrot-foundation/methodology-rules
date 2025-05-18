import type {
  CertificateRewardDistributionOutput,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type {
  MethodologyActorType,
  NonEmptyString,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

export type ActorsByType = Map<string, RewardsDistributionActor>;

export interface AggregateMassIdCertificateRewards {
  actors: ActorsByType;
  massIdCertificateTotalValue: BigNumber;
}

export interface Participant {
  id: NonEmptyString;
  name: NonEmptyString;
}

export interface Remainder<T = BigNumber> {
  amount: T;
  percentage: T;
}

export interface ResultContentsWithMassIdCertificateValue {
  massIdCertificateValue: BigNumber;
  resultContent: CertificateRewardDistributionOutput;
}

export interface RewardsDistribution {
  actors: RewardsDistributionActor[];
  creditUnitPrice: NonEmptyString;
  massIdCertificateTotalValue: NonEmptyString;
  remainder: Remainder<string>;
}

export interface RewardsDistributionActor {
  actorType: MethodologyActorType.REMAINDER | RewardsDistributionActorType;
  amount: NonEmptyString;
  participant: Participant;
  percentage: NonEmptyString;
}

export interface RuleSubject {
  creditUnitPrice: BigNumber;
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[];
}
