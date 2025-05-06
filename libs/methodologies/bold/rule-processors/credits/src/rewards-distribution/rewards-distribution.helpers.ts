import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { RewardsDistributionActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type NonEmptyString,
  type NonZeroPositive,
} from '@carrot-fndn/shared/types';
import BigNumber from 'bignumber.js';

import type {
  ActorsByActorType,
  AggregateMassIdRewards,
  Remainder,
  ResultContentsWithMassIdCertificateValue,
  RewardsDistribution,
} from './rewards-distribution.types';

export const formatPercentage = (percentage: BigNumber): BigNumber =>
  percentage.dividedBy(100);

export const formatDecimalPlaces = (value: BigNumber): BigNumber =>
  value.decimalPlaces(6, BigNumber.ROUND_DOWN);

export const calculateCreditPercentage = (
  amount: BigNumber,
  amountTotal: BigNumber,
): string =>
  formatDecimalPlaces(
    amount.dividedBy(amountTotal).multipliedBy(100),
  ).toString();

export const calculateRemainder = (options: {
  actors: ActorsByActorType;
  creditsDocumentUnitPrice: NonZeroPositive;
  massIdTotalValue: BigNumber;
}): Remainder => {
  const { actors, creditsDocumentUnitPrice, massIdTotalValue } = options;

  let participantsAmount = new BigNumber(0);
  let participantsPercentage = new BigNumber(0);

  for (const actor of actors.values()) {
    participantsAmount = participantsAmount.plus(actor.amount);
    participantsPercentage = participantsPercentage.plus(actor.percentage);
  }

  return {
    amount: massIdTotalValue
      .multipliedBy(creditsDocumentUnitPrice)
      .minus(participantsAmount),
    percentage: new BigNumber(100).minus(participantsPercentage),
  };
};

export const calculateAmount = (options: {
  creditsDocumentUnitPrice: NonZeroPositive;
  massIdCertificateValue: BigNumber;
  massIdPercentage: string;
  participantAmount: string | undefined;
}): NonEmptyString => {
  const amount = formatDecimalPlaces(
    formatPercentage(new BigNumber(options.massIdPercentage))
      .multipliedBy(options.massIdCertificateValue)
      .multipliedBy(new BigNumber(options.creditsDocumentUnitPrice)),
  );

  return amount.plus(options.participantAmount ?? 0).toString();
};

export const addParticipantRemainder = (options: {
  actors: ActorsByActorType;
  remainder: Remainder;
}): void => {
  const { actors, remainder } = options;

  for (const [key, actor] of actors) {
    if (actor.actorType === RewardsDistributionActorType.NETWORK) {
      actors.set(key, {
        ...actor,
        amount: remainder.amount.plus(actor.amount).toString(),
        percentage: remainder.percentage.plus(actor.percentage).toString(),
      });

      break;
    }
  }
};

const calculateCertificateTotalValue = (certificateValues: BigNumber[]) =>
  sumBigNumbers(certificateValues);

export const aggregateMassIdCertificatesRewards = (
  creditsDocumentUnitPrice: NonZeroPositive,
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[],
): AggregateMassIdRewards => {
  const actors: ActorsByActorType = new Map();

  const certificateTotalValue = calculateCertificateTotalValue(
    resultContentsWithMassIdCertificateValue.map(
      ({ massIdCertificateValue }) => massIdCertificateValue,
    ),
  );

  const creditTotal = formatDecimalPlaces(
    certificateTotalValue.multipliedBy(creditsDocumentUnitPrice),
  );

  for (const {
    massIdCertificateValue,
    resultContent: { massIdRewards },
  } of resultContentsWithMassIdCertificateValue) {
    for (const massIdReward of massIdRewards) {
      const { actorType, massIdPercentage, participant } = massIdReward;
      const actor = actors.get(`${actorType}-${participant.id}`);

      const amount = calculateAmount({
        creditsDocumentUnitPrice,
        massIdCertificateValue,
        massIdPercentage,
        participantAmount: actor?.amount,
      });

      actors.set(`${actorType}-${participant.id}`, {
        actorType,
        amount,
        participant,
        percentage: calculateCreditPercentage(
          new BigNumber(amount),
          creditTotal,
        ),
      });
    }
  }

  return {
    actors,
    massIdTotalValue: certificateTotalValue,
  };
};

export const calculateRewardsDistribution = (ruleSubject: {
  creditsDocumentUnitPrice: NonZeroPositive;
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[];
}): RewardsDistribution => {
  const { creditsDocumentUnitPrice } = ruleSubject;

  const resultContentsWithMassIdCertificateValue =
    ruleSubject.resultContentsWithMassIdCertificateValue.map(
      ({ massIdCertificateValue, resultContent }) => ({
        massIdCertificateValue,
        resultContent,
      }),
    );

  const { actors, massIdTotalValue } = aggregateMassIdCertificatesRewards(
    creditsDocumentUnitPrice,
    resultContentsWithMassIdCertificateValue,
  );

  const remainder = calculateRemainder({
    actors,
    creditsDocumentUnitPrice,
    massIdTotalValue,
  });

  addParticipantRemainder({
    actors,
    remainder,
  });

  return {
    actors: [...actors.values()],
    creditsUnitPrice: creditsDocumentUnitPrice,
    massIdTotalValue: massIdTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
};
