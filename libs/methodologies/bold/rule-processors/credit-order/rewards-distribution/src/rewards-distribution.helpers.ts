import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import { RewardsDistributionActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type {
  ActorsByType,
  AggregateMassIDCertificateRewards,
  Remainder,
  ResultContentsWithMassIDCertificateValue,
  RewardsDistribution,
  RuleSubject,
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

export const calculateAbsoluteValue = (options: {
  massIDCertificateValue: BigNumber;
  percentage: BigNumber;
}): NonEmptyString =>
  formatPercentage(options.percentage)
    .multipliedBy(options.massIDCertificateValue)
    .toString();

export const addAmount = (options: {
  previousAmount: BigNumber;
  pricePerUnit: BigNumber;
  value: BigNumber;
}): NonEmptyString => {
  const amount = formatDecimalPlaces(
    options.value.multipliedBy(options.pricePerUnit),
  );

  return amount.plus(options.previousAmount).toString();
};

export const calculateAmount = (options: {
  creditUnitPrice: BigNumber;
  massIDCertificateValue: BigNumber;
  massIDPercentage: BigNumber;
  previousParticipantAmount: BigNumber;
}): NonEmptyString => {
  const value = new BigNumber(
    calculateAbsoluteValue({
      massIDCertificateValue: options.massIDCertificateValue,
      percentage: options.massIDPercentage,
    }),
  );

  return addAmount({
    previousAmount: options.previousParticipantAmount,
    pricePerUnit: options.creditUnitPrice,
    value,
  });
};

export const calculateRemainder = (options: {
  actors: ActorsByType;
  creditUnitPrice: BigNumber;
  massIDCertificateTotalValue: BigNumber;
}): Remainder => {
  const { actors, creditUnitPrice, massIDCertificateTotalValue } = options;

  let participantsAmount = new BigNumber(0);
  let participantsPercentage = new BigNumber(0);

  for (const actor of actors.values()) {
    participantsAmount = participantsAmount.plus(actor.amount);
    participantsPercentage = participantsPercentage.plus(actor.percentage);
  }
  const rawAmount = massIDCertificateTotalValue
    .multipliedBy(creditUnitPrice)
    .minus(participantsAmount);
  const rawPercentage = new BigNumber(100).minus(participantsPercentage);

  return {
    amount: formatDecimalPlaces(BigNumber.maximum(rawAmount, 0)),
    percentage: formatDecimalPlaces(BigNumber.maximum(rawPercentage, 0)),
  };
};

export const addParticipantRemainder = (options: {
  actors: ActorsByType;
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

export const aggregateMassIDCertificatesRewards = (
  creditUnitPrice: BigNumber,
  resultContentsWithMassIDCertificateValue: ResultContentsWithMassIDCertificateValue[],
): AggregateMassIDCertificateRewards => {
  const actors: ActorsByType = new Map();

  const massIDCertificateTotalValue = calculateCertificateTotalValue(
    resultContentsWithMassIDCertificateValue.map(
      ({ massIDCertificateValue }) => massIDCertificateValue,
    ),
  );

  const creditTotal = formatDecimalPlaces(
    massIDCertificateTotalValue.multipliedBy(creditUnitPrice),
  );

  for (const {
    massIDCertificateValue,
    resultContent: { massIDRewards },
  } of resultContentsWithMassIDCertificateValue) {
    for (const massIDReward of massIDRewards) {
      const {
        actorType,
        address,
        massIDPercentage,
        participant,
        preserveSensitiveData,
      } = massIDReward;
      const participantKey = getAggregateParticipantKey(
        actorType,
        participant.id,
      );
      const actor = actors.get(participantKey);

      const amount = calculateAmount({
        creditUnitPrice,
        massIDCertificateValue,
        massIDPercentage: new BigNumber(massIDPercentage),
        previousParticipantAmount: actor?.amount
          ? new BigNumber(actor.amount)
          : new BigNumber(0),
      });

      actors.set(participantKey, {
        actorType,
        address,
        amount,
        participant,
        percentage: calculateCreditPercentage({
          amount: new BigNumber(amount),
          totalAmount: creditTotal,
        }),
        preserveSensitiveData,
      });
    }
  }

  return {
    actors,
    massIDCertificateTotalValue,
  };
};

export const calculateRewardsDistribution = (
  ruleSubject: RuleSubject,
): RewardsDistribution => {
  const { creditUnitPrice } = ruleSubject;

  const resultContentsWithMassIDCertificateValue =
    ruleSubject.resultContentsWithMassIDCertificateValue.map(
      ({ massIDCertificateValue, resultContent }) => ({
        massIDCertificateValue,
        resultContent,
      }),
    );

  const { actors, massIDCertificateTotalValue } =
    aggregateMassIDCertificatesRewards(
      creditUnitPrice,
      resultContentsWithMassIDCertificateValue,
    );

  const remainder = calculateRemainder({
    actors,
    creditUnitPrice,
    massIDCertificateTotalValue,
  });

  addParticipantRemainder({
    actors,
    remainder,
  });

  return {
    actors: [...actors.values()],
    creditUnitPrice: creditUnitPrice.toString(),
    massIDCertificateTotalValue: massIDCertificateTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
};
