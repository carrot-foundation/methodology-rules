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
  type MassIDReward,
  RewardActorAddress,
  type RewardActorParticipant,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
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

export const isHaulerActorDefined = (
  participants: RewardsDistributionActor[],
): boolean =>
  participants.some(({ type }) => type === RewardsDistributionActorType.Hauler);

export const formatPercentage = (percentage: BigNumber): string =>
  percentage.multipliedBy(100).toString();

export const mapMassIDRewards = (participants: ActorReward[]): MassIDReward[] =>
  participants.map(
    ({
      actorType,
      address,
      massIDPercentage,
      participant,
      preserveSensitiveData,
    }) => ({
      actorType,
      address,
      massIDPercentage: formatPercentage(massIDPercentage),
      participant,
      preserveSensitiveData,
    }),
  );

export const mapActorReward = ({
  actorType,
  address,
  massIDDocument,
  massIDPercentage,
  participant,
  preserveSensitiveData,
}: {
  actorType: RewardsDistributionActorType;
  address: RewardActorAddress;
  massIDDocument: Document;
  massIDPercentage: BigNumber;
  participant: RewardActorParticipant;
  preserveSensitiveData: boolean | undefined;
}): ActorReward => ({
  actorType,
  address,
  massIDDocument,
  massIDPercentage,
  participant,
  preserveSensitiveData,
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
        preserveSensitiveData: actorEvent?.preserveSensitiveData,
        type: actorType,
      },
    ];
  }

  return actors.filter(({ type }) => type === actorType);
};

const LOGISTICS_OR_SERVICE_PROVIDERS = new Set<RewardsDistributionActorType>([
  RewardsDistributionActorType.Hauler,
  RewardsDistributionActorType.Processor,
  RewardsDistributionActorType.Recycler,
]);

export const isLogisticsOrServiceProvider = (
  actorType: RewardsDistributionActorType,
): boolean => LOGISTICS_OR_SERVICE_PROVIDERS.has(actorType);

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

  if (actorType === RewardsDistributionActorType.Network) {
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
    (event) =>
      getEventAttributeValue(
        event,
        DocumentEventAttributeName['Waste Origin'],
      ) === DocumentEventAttributeValue.Unidentified,
  );

  const hasWasteGeneratorEvent = getOrDefault(document.externalEvents, []).some(
    (event) =>
      isActorEvent(event) &&
      eventLabelIsAnyOf([MethodologyDocumentEventLabel['Waste Generator']])(
        event,
      ),
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

export const shouldApplyLargeBusinessDiscount = (
  wasteGeneratorVerificationDocument: Document | undefined,
): boolean => {
  if (isNil(wasteGeneratorVerificationDocument)) {
    return true;
  }

  const onboardingDeclarationEvent =
    wasteGeneratorVerificationDocument.externalEvents?.find(
      (event) => event.name === DocumentEventName['Onboarding Declaration'],
    );

  if (isNil(onboardingDeclarationEvent)) {
    return true;
  }

  const businessSize = getEventAttributeValue(
    onboardingDeclarationEvent,
    DocumentEventAttributeName['Business Size Declaration'],
  );

  if (isNil(businessSize)) {
    return true;
  }

  return String(businessSize) === DocumentEventAttributeValue['Large Business'];
};

export const applyLargeBusinessDiscount = (
  fullPercentage: BigNumber,
  shouldApplyDiscount: boolean,
): BigNumber => {
  if (shouldApplyDiscount) {
    return fullPercentage.multipliedBy(1 - LARGE_REVENUE_BUSINESS_DISCOUNT);
  }

  return fullPercentage;
};

export const calculateCommunityImpactPoolShare = (
  fullPercentage: BigNumber,
  shouldApplyDiscount: boolean,
): BigNumber => {
  if (!shouldApplyDiscount) {
    return new BigNumber(0);
  }

  return fullPercentage.multipliedBy(LARGE_REVENUE_BUSINESS_DISCOUNT);
};

export const getNgoActorMassIDPercentage = (
  massIDDocument: Document,
  actorMassIDPercentage: BigNumber,
  actors: RewardsDistributionActor[],
  rewardDistributions: RewardsDistributionActorTypePercentage,
  getWasteGeneratorFullPercentage: (
    targetDocument: Document,
    targetActorMassIDPercentage: BigNumber,
    targetActors: RewardsDistributionActor[],
    targetRewardDistributions: RewardsDistributionActorTypePercentage,
  ) => BigNumber,
  wasteGeneratorVerificationDocument: Document | undefined,
): BigNumber => {
  const fullPercentage = getWasteGeneratorFullPercentage(
    massIDDocument,
    actorMassIDPercentage,
    actors,
    rewardDistributions,
  );

  const shouldApplyDiscount = shouldApplyLargeBusinessDiscount(
    wasteGeneratorVerificationDocument,
  );

  return calculateCommunityImpactPoolShare(fullPercentage, shouldApplyDiscount);
};

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
