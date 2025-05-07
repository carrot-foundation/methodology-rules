import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { RewardsDistributionActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
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

export const calculateCreditPercentage = ({
  amount,
  totalAmount,
}: {
  amount: BigNumber;
  totalAmount: BigNumber;
}): string =>
  (totalAmount.isZero()
    ? new BigNumber(0)
    : formatDecimalPlaces(amount.dividedBy(totalAmount).multipliedBy(100))
  ).toString();

export const calculateRemainder = (options: {
  actors: ActorsByActorType;
  certificateTotalValue: BigNumber;
  creditUnitPrice: BigNumber;
}): Remainder => {
  const { actors, certificateTotalValue, creditUnitPrice } = options;

  let participantsAmount = new BigNumber(0);
  let participantsPercentage = new BigNumber(0);

  for (const actor of actors.values()) {
    participantsAmount = participantsAmount.plus(actor.amount);
    participantsPercentage = participantsPercentage.plus(actor.percentage);
  }
  const rawAmount = certificateTotalValue
    .multipliedBy(creditUnitPrice)
    .minus(participantsAmount);
  const rawPercentage = new BigNumber(100).minus(participantsPercentage);

  return {
    amount: formatDecimalPlaces(BigNumber.maximum(rawAmount, 0)),
    percentage: formatDecimalPlaces(BigNumber.maximum(rawPercentage, 0)),
  };
};

export const calculateAmount = (options: {
  creditUnitPrice: BigNumber;
  massIdCertificateValue: BigNumber;
  massIdPercentage: string;
  participantAmount: string | undefined;
}): NonEmptyString => {
  const amount = formatDecimalPlaces(
    formatPercentage(new BigNumber(options.massIdPercentage))
      .multipliedBy(options.massIdCertificateValue)
      .multipliedBy(new BigNumber(options.creditUnitPrice)),
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

export const getAggregateParticipantKey = (
  actorType: RewardsDistributionActorType | string | undefined,
  participantId: string | undefined,
): string => {
  if (!actorType || !participantId) {
    throw new Error('Actor type and participant ID are required');
  }

  return `${actorType}-${participantId}`;
};

export const aggregateMassIdCertificatesRewards = (
  creditUnitPrice: BigNumber,
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[],
): AggregateMassIdRewards => {
  const actors: ActorsByActorType = new Map();

  const certificateTotalValue = calculateCertificateTotalValue(
    resultContentsWithMassIdCertificateValue.map(
      ({ massIdCertificateValue }) => massIdCertificateValue,
    ),
  );

  const creditTotal = formatDecimalPlaces(
    certificateTotalValue.multipliedBy(creditUnitPrice),
  );

  for (const {
    massIdCertificateValue,
    resultContent: { massIdRewards },
  } of resultContentsWithMassIdCertificateValue) {
    for (const massIdReward of massIdRewards) {
      const { actorType, massIdPercentage, participant } = massIdReward;
      const participantKey = getAggregateParticipantKey(
        actorType,
        participant.id,
      );
      const actor = actors.get(participantKey);

      const amount = calculateAmount({
        creditUnitPrice,
        massIdCertificateValue,
        massIdPercentage,
        participantAmount: actor?.amount,
      });

      actors.set(participantKey, {
        actorType,
        amount,
        participant,
        percentage: calculateCreditPercentage({
          amount: new BigNumber(amount),
          totalAmount: creditTotal,
        }),
      });
    }
  }

  return {
    actors,
    certificateTotalValue,
  };
};

export const calculateRewardsDistribution = (ruleSubject: {
  creditUnitPrice: BigNumber;
  resultContentsWithMassIdCertificateValue: ResultContentsWithMassIdCertificateValue[];
}): RewardsDistribution => {
  const { creditUnitPrice } = ruleSubject;

  const resultContentsWithMassIdCertificateValue =
    ruleSubject.resultContentsWithMassIdCertificateValue.map(
      ({ massIdCertificateValue, resultContent }) => ({
        massIdCertificateValue,
        resultContent,
      }),
    );

  const { actors, certificateTotalValue } = aggregateMassIdCertificatesRewards(
    creditUnitPrice,
    resultContentsWithMassIdCertificateValue,
  );

  const remainder = calculateRemainder({
    actors,
    certificateTotalValue,
    creditUnitPrice,
  });

  addParticipantRemainder({
    actors,
    remainder,
  });

  return {
    actors: [...actors.values()],
    certificateTotalValue: certificateTotalValue.toString(),
    creditsUnitPrice: creditUnitPrice.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
};
