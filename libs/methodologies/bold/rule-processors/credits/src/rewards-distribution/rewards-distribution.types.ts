import type {
  CertificateRewardDistributionOutput,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type {
  MethodologyActorType,
  NonEmptyString,
  NonZeroPositive,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

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
  creditsUnitPrice: NonZeroPositive;
  massIdTotalValue: NonEmptyString;
  remainder: Remainder<string>;
}

export interface AggregateMassIdRewards {
  actors: ActorsByActorType;
  massIdTotalValue: BigNumber;
}

export interface Remainder<T = BigNumber> {
  amount: T;
  percentage: T;
}
