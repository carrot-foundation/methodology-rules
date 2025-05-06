import { isNil } from '@carrot-fndn/shared/helpers';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventName,
  type MassIdReward,
  type RewardActorParticipant,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type {
  ActorReward,
  RewardsDistributionActor,
} from './rewards-distribution.types';

import { REQUIRED_ACTOR_TYPES } from './rewards-distribution.constants';

export const isHaulerActorDefined = (
  participants: RewardsDistributionActor[],
): boolean =>
  participants.some(({ type }) => type === RewardsDistributionActorType.HAULER);

export const formatPercentage = (percentage: BigNumber): string =>
  percentage.multipliedBy(100).toString();

export const mapMassIdRewards = (participants: ActorReward[]): MassIdReward[] =>
  participants.map(({ actorType, massIdPercentage, participant }) => ({
    actorType,
    massIdPercentage: formatPercentage(massIdPercentage),
    participant,
  }));

export const mapActorReward = ({
  actorType,
  massIdDocument,
  massIdPercentage,
  participant,
}: {
  actorType: RewardsDistributionActorType;
  massIdDocument: Document;
  massIdPercentage: BigNumber;
  participant: RewardActorParticipant;
}): ActorReward => ({
  actorType,
  massIdDocument,
  massIdPercentage,
  participant,
});

export const getActorsByType = ({
  actorType,
  actors,
  methodologyDocument,
}: {
  actorType: RewardsDistributionActorType;
  actors: RewardsDistributionActor[];
  methodologyDocument: Document;
}): RewardsDistributionActor[] => {
  if (REQUIRED_ACTOR_TYPES.METHODOLOGY.includes(actorType)) {
    const methodologyParticipant = methodologyDocument.externalEvents?.find(
      and(
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
        eventLabelIsAnyOf([actorType]),
      ),
    )?.participant;

    if (isNil(methodologyParticipant)) {
      throw new Error(`${actorType} not found in the methodology document`);
    }

    return [
      {
        participant: {
          id: methodologyParticipant.id,
          name: methodologyParticipant.name,
        },
        type: actorType,
      },
    ];
  }

  return actors.filter(({ type }) => type === actorType);
};
