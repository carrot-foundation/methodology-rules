import {
  getOrDefault,
  isNil,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
  isActorEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventAttributeValue,
  DocumentEventName,
  type MassIdReward,
  RewardActorAddress,
  type RewardActorParticipant,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type {
  ActorReward,
  RewardsDistributionActor,
  RewardsDistributionActorTypePercentage,
  UnidentifiedWasteCalculationDto,
} from './rewards-distribution.types';

import {
  LARGE_REVENUE_BUSINESS_DISCOUNT,
  REQUIRED_ACTOR_TYPES,
} from './rewards-distribution.constants';

const { UNIDENTIFIED } = DocumentEventAttributeValue;
const { WASTE_ORIGIN } = DocumentEventAttributeName;
const WASTE_GENERATOR = 'Waste Generator';

export const isHaulerActorDefined = (
  participants: RewardsDistributionActor[],
): boolean =>
  participants.some(({ type }) => type === RewardsDistributionActorType.HAULER);

export const formatPercentage = (percentage: BigNumber): string =>
  percentage.multipliedBy(100).toString();

export const mapMassIdRewards = (participants: ActorReward[]): MassIdReward[] =>
  participants.map(({ actorType, address, massIdPercentage, participant }) => ({
    actorType,
    address,
    massIdPercentage: formatPercentage(massIdPercentage),
    participant,
  }));

export const mapActorReward = ({
  actorType,
  address,
  massIdDocument,
  massIdPercentage,
  participant,
}: {
  actorType: RewardsDistributionActorType;
  address: RewardActorAddress;
  massIdDocument: Document;
  massIdPercentage: BigNumber;
  participant: RewardActorParticipant;
}): ActorReward => ({
  actorType,
  address,
  massIdDocument,
  massIdPercentage,
  participant,
});

export const getActorsByType = ({
  actors,
  actorType,
  methodologyDocument,
}: {
  actors: RewardsDistributionActor[];
  actorType: RewardsDistributionActorType;
  methodologyDocument: Document;
}): RewardsDistributionActor[] => {
  if (REQUIRED_ACTOR_TYPES.METHODOLOGY.includes(actorType)) {
    const actorEvent = methodologyDocument.externalEvents?.find(
      and(
        eventNameIsAnyOf([DocumentEventName.ACTOR]),
        eventLabelIsAnyOf([actorType]),
      ),
    );

    const methodologyParticipant = actorEvent?.participant;
    const methodologyAddress = actorEvent?.address;

    if (isNil(methodologyParticipant)) {
      throw new Error(`${actorType} not found in the methodology document`);
    }

    if (isNil(methodologyAddress)) {
      throw new Error(
        `${actorType} address not found in the methodology document`,
      );
    }

    return [
      {
        address: {
          id: methodologyAddress.id,
        },
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

export const isLogisticsOrServiceProvider = (
  actorType: RewardsDistributionActorType,
): boolean =>
  [
    RewardsDistributionActorType.HAULER,
    RewardsDistributionActorType.PROCESSOR,
    RewardsDistributionActorType.RECYCLER,
  ].includes(actorType);

export const applySupplyChainDigitizationDiscount = (
  basePercentage: BigNumber,
): BigNumber => basePercentage.multipliedBy(0.75);

export const calculateNetworkPercentageForUnidentifiedWasteOrigin = (
  dto: UnidentifiedWasteCalculationDto,
): BigNumber => {
  const {
    actors,
    additionalPercentage,
    basePercentage,
    rewardDistributions,
    wasteGeneratorPercentage,
  } = dto;

  let networkPercentage = basePercentage
    .plus(wasteGeneratorPercentage)
    .plus(additionalPercentage)
    .plus(new BigNumber(rewardDistributions.Processor).multipliedBy(0.25))
    .plus(new BigNumber(rewardDistributions.Recycler).multipliedBy(0.25));

  if (isHaulerActorDefined(actors)) {
    networkPercentage = networkPercentage.plus(
      new BigNumber(rewardDistributions.Hauler).multipliedBy(0.25),
    );
  }

  return networkPercentage;
};

export const calculatePercentageForUnidentifiedWasteOrigin = (
  dto: UnidentifiedWasteCalculationDto,
): BigNumber => {
  const { actorType, basePercentage } = dto;

  if (actorType === RewardsDistributionActorType.NETWORK) {
    return calculateNetworkPercentageForUnidentifiedWasteOrigin(dto);
  }

  if (isLogisticsOrServiceProvider(actorType)) {
    return applySupplyChainDigitizationDiscount(basePercentage);
  }

  return basePercentage;
};

export const isWasteOriginIdentified = (document: Document): boolean => {
  const hasUnidentifiedOriginAttribute = getOrDefault(
    document.externalEvents,
    [],
  ).some(
    (event) => getEventAttributeValue(event, WASTE_ORIGIN) === UNIDENTIFIED,
  );

  const hasWasteGeneratorEvent = getOrDefault(document.externalEvents, []).some(
    (event) =>
      isActorEvent(event) && eventLabelIsAnyOf([WASTE_GENERATOR])(event),
  );

  return !hasUnidentifiedOriginAttribute || hasWasteGeneratorEvent;
};

export const getWasteGeneratorAdditionalPercentage = (
  actors: RewardsDistributionActor[],
  rewardDistributions: RewardsDistributionActorTypePercentage,
): BigNumber => {
  if (!isHaulerActorDefined(actors)) {
    return new BigNumber(rewardDistributions.Hauler);
  }

  return new BigNumber(0);
};

export const getNgoActorMassIdPercentage = (
  massIdDocument: Document,
  actorMassIdPercentage: BigNumber,
  actors: RewardsDistributionActor[],
  rewardDistributions: RewardsDistributionActorTypePercentage,
  getWasteGeneratorFullPercentage: (
    targetDocument: Document,
    targetActorMassIdPercentage: BigNumber,
    targetActors: RewardsDistributionActor[],
    targetRewardDistributions: RewardsDistributionActorTypePercentage,
  ) => BigNumber,
): BigNumber =>
  getWasteGeneratorFullPercentage(
    massIdDocument,
    actorMassIdPercentage,
    actors,
    rewardDistributions,
  ).multipliedBy(LARGE_REVENUE_BUSINESS_DISCOUNT);

export const checkIfHasRequiredActorTypes = ({
  actors,
  documentId,
  requiredActorTypes,
}: {
  actors: RewardsDistributionActor[];
  documentId: string;
  requiredActorTypes: RewardsDistributionActorType[];
}): void => {
  const missingRequiredActors = requiredActorTypes.filter(
    (requiredActorType) =>
      !actors.some((actor) => actor.type === requiredActorType),
  );

  if (isNonEmptyArray(missingRequiredActors)) {
    throw new Error(
      `Missing required actors in document ${documentId}: ${missingRequiredActors.join(', ')}`,
    );
  }
};
