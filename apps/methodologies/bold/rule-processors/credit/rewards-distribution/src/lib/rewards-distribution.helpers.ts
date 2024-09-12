import type {
  NonEmptyString,
  NonZeroPositive,
} from '@carrot-fndn/shared/types';

import { DocumentEventActorType } from '@carrot-fndn/methodologies/bold/types';
import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import BigNumber from 'bignumber.js';

import type {
  ActorsByActorType,
  AggregateCertificateRewards,
  Remainder,
  ResultContentWithMassValue,
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
  massTotalValue: BigNumber;
  unitPrice: NonZeroPositive;
}): Remainder => {
  const { actors, massTotalValue, unitPrice } = options;

  let participantsAmount = new BigNumber(0);
  let participantsPercentage = new BigNumber(0);

  for (const actor of actors.values()) {
    participantsAmount = participantsAmount.plus(actor.amount);
    participantsPercentage = participantsPercentage.plus(actor.percentage);
  }

  return {
    amount: massTotalValue.multipliedBy(unitPrice).minus(participantsAmount),
    percentage: new BigNumber(100).minus(participantsPercentage),
  };
};

export const calculateAmount = (options: {
  massCertificatePercentage: string;
  massValue: BigNumber;
  participantAmount: string | undefined;
  unitPrice: NonZeroPositive;
}): NonEmptyString => {
  const amount = formatDecimalPlaces(
    formatPercentage(new BigNumber(options.massCertificatePercentage))
      .multipliedBy(options.massValue)
      .multipliedBy(new BigNumber(options.unitPrice)),
  );

  return amount.plus(options.participantAmount ?? 0).toString();
};

export const addParticipantRemainder = (options: {
  actors: ActorsByActorType;
  massTotalValue: BigNumber;
  remainder: Remainder;
  unitPrice: NonZeroPositive;
}): void => {
  const { actors, remainder } = options;

  for (const [key, actor] of actors) {
    if (actor.actorType === DocumentEventActorType.NETWORK) {
      actors.set(key, {
        ...actor,
        amount: remainder.amount.plus(actor.amount).toString(),
        percentage: remainder.percentage.plus(actor.percentage).toString(),
      });

      break;
    }
  }
};

const calculateMassTotalValue = (massValues: BigNumber[]) =>
  sumBigNumbers(massValues);

export const aggregateCertificateRewards = (
  unitPrice: NonZeroPositive,
  resultContentsWithMassValue: ResultContentWithMassValue[],
): AggregateCertificateRewards => {
  const actors: ActorsByActorType = new Map();

  const massTotalValue = calculateMassTotalValue(
    resultContentsWithMassValue.map(({ massValue }) => massValue),
  );

  const creditTotal = formatDecimalPlaces(
    massTotalValue.multipliedBy(unitPrice),
  );

  for (const {
    massValue,
    resultContent: { certificateRewards },
  } of resultContentsWithMassValue) {
    for (const certificateReward of certificateRewards) {
      const { actorType, participant, percentage } = certificateReward;
      const actor = actors.get(`${actorType}-${participant.id}`);

      const amount = calculateAmount({
        massCertificatePercentage: percentage,
        massValue,
        participantAmount: actor?.amount,
        unitPrice,
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
    massTotalValue,
  };
};

export const calculateRewardsDistribution = (
  unitPrice: NonZeroPositive,
  resultContentsWithMassValue: ResultContentWithMassValue[],
): RewardsDistribution => {
  const { actors, massTotalValue } = aggregateCertificateRewards(
    unitPrice,
    resultContentsWithMassValue,
  );

  const remainder = calculateRemainder({
    actors,
    massTotalValue,
    unitPrice,
  });

  addParticipantRemainder({
    actors,
    massTotalValue,
    remainder,
    unitPrice,
  });

  return {
    actors: [...actors.values()],
    massTotalValue: massTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
    unitPrice,
  };
};
