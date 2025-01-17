import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  type MassReward,
  type RewardActorParticipant,
  type RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { isNil } from '@carrot-fndn/shared/helpers';
import BigNumber from 'bignumber.js';

import type {
  ActorReward,
  RewardsDistributionActor,
} from './rewards-distribution.types';

import { REQUIRED_ACTOR_TYPES } from './rewards-distribution.constants';

export const checkIfHaulerActorExists = (
  participants: RewardsDistributionActor[],
) => participants.some(({ type }) => type === DocumentEventActorType.HAULER);

export const sumBigNumbers = (values: BigNumber[]): BigNumber => {
  let result = new BigNumber(0);

  for (const value of values) {
    result = result.plus(value);
  }

  return result;
};

export const getDocumentsTotalMassWeight = (documents: Document[]): BigNumber =>
  sumBigNumbers(
    documents.map(({ currentValue }) => new BigNumber(currentValue)),
  );

export const formatPercentage = (percentage: BigNumber): string =>
  percentage.multipliedBy(100).toString();

export const mapMassRewards = (participants: ActorReward[]): MassReward[] =>
  participants.map(
    ({
      actorType,
      document,
      massCertificatePercentage,
      massPercentage,
      participant,
    }) => ({
      actorType,
      documentId: document.id,
      massCertificatePercentage: formatPercentage(massCertificatePercentage),
      massPercentage: formatPercentage(massPercentage),
      participant,
    }),
  );

export const getActorPercentageOfMassCertificate = (
  document: Document,
  participantPercentage: BigNumber,
  documentsTotalMassWeight: BigNumber,
): BigNumber => {
  const participantMassWeight = new BigNumber(
    participantPercentage,
  ).multipliedBy(document.currentValue);

  return participantMassWeight.div(documentsTotalMassWeight);
};

export const mapActorReward = ({
  actorType,
  document,
  massPercentage,
  participant,
  totalMassOfDocuments,
}: {
  actorType: RewardsDistributionActorType;
  document: Document;
  massPercentage: BigNumber;
  participant: RewardActorParticipant;
  totalMassOfDocuments: BigNumber;
}): ActorReward => ({
  actorType,
  document,
  massCertificatePercentage: getActorPercentageOfMassCertificate(
    document,
    massPercentage,
    totalMassOfDocuments,
  ),
  massPercentage,
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
        metadataAttributeValueIsAnyOf(DocumentEventAttributeName.ACTOR_TYPE, [
          actorType,
        ]),
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
