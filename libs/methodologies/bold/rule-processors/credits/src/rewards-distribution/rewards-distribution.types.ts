import type {
  CertificateRewardDistributionOutput,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type {
  MethodologyActorType,
  NonEmptyString,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

export interface RuleSubject {
  creditUnitPrice: BigNumber;
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[];
}

export interface ResultContentsWithMassIdCertificateValue {
  massIdCertificateValue: BigNumber;
  resultContent: CertificateRewardDistributionOutput;
}

export interface Participant {
  id: NonEmptyString;
  name: NonEmptyString;
}

export interface RewardsDistributionActor {
  actorType: MethodologyActorType.REMAINDER | RewardsDistributionActorType;
  amount: NonEmptyString;
  participant: Participant;
  percentage: NonEmptyString;
}

export type ActorsByActorType = Map<string, RewardsDistributionActor>;

export interface RewardsDistribution {
  actors: RewardsDistributionActor[];
  certificateTotalValue: NonEmptyString;
  creditsUnitPrice: NonEmptyString;
  remainder: Remainder<string>;
}

export interface AggregateMassIdRewards {
  actors: ActorsByActorType;
  certificateTotalValue: BigNumber;
}

export interface Remainder<T = BigNumber> {
  amount: T;
  percentage: T;
}
