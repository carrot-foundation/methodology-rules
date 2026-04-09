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
  RewardsDistributionActor,
  RuleSubject,
} from './rewards-distribution.types';

// Canonical actor order — mirrors smaug's palantir/helpers/src/helpers.ts
// ACTOR_TYPE_SORT_ORDER. Keep in sync with that file when it changes.
//
// NOTE: RewardsDistributionActorType is inferred from a Zod enum whose values
// are cast to [string, ...string[]], so at the type level it is `string` and
// this Record is not compile-time exhaustive. The runtime guarantees that every
// actor type has an entry come from: (a) upstream Zod validation on document
// events, which narrows the set of actual values to the 9 enum members; and
// (b) the `assigns a sort order to every RewardsDistributionActorType` test,
// which iterates Object.values(RewardsDistributionActorType) and verifies
// every one is sortable by this table.

const ACTOR_TYPE_SORT_ORDER: Record<RewardsDistributionActorType, number> = {
  [RewardsDistributionActorType.COMMUNITY_IMPACT_POOL]: 5,
  [RewardsDistributionActorType.HAULER]: 2,
  [RewardsDistributionActorType.INTEGRATOR]: 6,
  [RewardsDistributionActorType.METHODOLOGY_AUTHOR]: 7,
  [RewardsDistributionActorType.METHODOLOGY_DEVELOPER]: 8,
  [RewardsDistributionActorType.NETWORK]: 9,
  [RewardsDistributionActorType.PROCESSOR]: 3,
  [RewardsDistributionActorType.RECYCLER]: 4,
  [RewardsDistributionActorType.WASTE_GENERATOR]: 1,
};

export const sortRewardsDistributionActors = (
  actors: readonly RewardsDistributionActor[],
): RewardsDistributionActor[] =>
  [...actors].sort((a, b) => {
    // Non-null assertions: upstream Zod validation + the completeness test
    // guarantee every actorType has an entry at runtime.
    const orderA = ACTOR_TYPE_SORT_ORDER[a.actorType]!;

    const orderB = ACTOR_TYPE_SORT_ORDER[b.actorType]!;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Tiebreak within a type: lexicographic by participant id.
    return a.participant.id.localeCompare(b.participant.id);
  });

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
  actorType: RewardsDistributionActorType | undefined,
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
    actors: sortRewardsDistributionActors([...actors.values()]),
    creditUnitPrice: creditUnitPrice.toString(),
    massIDCertificateTotalValue: massIDCertificateTotalValue.toString(),
    remainder: {
      amount: remainder.amount.toString(),
      percentage: remainder.percentage.toString(),
    },
  };
};
