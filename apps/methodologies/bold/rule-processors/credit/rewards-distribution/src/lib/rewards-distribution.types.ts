import type {
  CertificateRewardDistributionOutput,
  DocumentEventActorType,
  RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/types';
import type {
  NonEmptyString,
  NonZeroPositive,
} from '@carrot-fndn/shared/types';
import type BigNumber from 'bignumber.js';

export interface ResultContentWithMassValue {
  massValue: BigNumber;
  resultContent: CertificateRewardDistributionOutput;
}

export interface Participant {
  id: NonEmptyString;
  name: NonEmptyString;
}

export interface Actor {
  actorType: DocumentEventActorType.REMAINDER | RewardsDistributionActorType;
  amount: NonEmptyString;
  participant: Participant;
  percentage: NonEmptyString;
}

export type ActorsByActorType = Map<string, Actor>;

export interface RewardsDistribution {
  actors: Actor[];
  massTotalValue: NonEmptyString;
  remainder: Remainder<string>;
  unitPrice: NonZeroPositive;
}

export interface Remainder<T = BigNumber> {
  amount: T;
  percentage: T;
}
