import type { NonZeroPositive } from '@carrot-fndn/shared/types';

import { DocumentEventActorType } from '@carrot-fndn/methodologies/bold/types';
import { sumBigNumbers } from '@carrot-fndn/shared/helpers';
import BigNumber from 'bignumber.js';

import type {
  Actor,
  ActorsByActorType,
  ResultContentWithMassValue,
  RewardsDistribution,
} from './rewards-distribution.types';

export const AMOUNT_DECIMALS = 6;
export const PERCENTAGE_DECIMALS = 10;

export const roundAmount = (value: BigNumber): BigNumber =>
  value.decimalPlaces(AMOUNT_DECIMALS, BigNumber.ROUND_DOWN);

export const formatPercentage = (value: BigNumber, totalValue: BigNumber) =>
  value
    .dividedBy(totalValue)
    .multipliedBy(100)
    .decimalPlaces(PERCENTAGE_DECIMALS, BigNumber.ROUND_DOWN)
    .toString(PERCENTAGE_DECIMALS);

export const calculateRewardsDistribution = (
  unitPrice: NonZeroPositive,
  resultContentsWithMassValue: ResultContentWithMassValue[],
): RewardsDistribution => {
  const actors: ActorsByActorType = new Map();
  let networkActorKey = '';

  const massTotalValue = sumBigNumbers(
    resultContentsWithMassValue.map(({ massValue }) => massValue),
  );
  const totalAmount = roundAmount(massTotalValue.multipliedBy(unitPrice));

  for (const {
    massValue,
    resultContent: { certificateRewards },
  } of resultContentsWithMassValue) {
    for (const { actorType, participant, percentage } of certificateRewards) {
      const actorKey = `${actorType}-${participant.id}`;
      const aggregatedActor = actors.get(actorKey);
      const actorCurrentAmount = aggregatedActor?.amount ?? 0;
      const actorCertificateAmount = roundAmount(
        new BigNumber(percentage)
          .dividedBy(100)
          .multipliedBy(massValue)
          .multipliedBy(unitPrice),
      );

      const actorAmount = roundAmount(
        actorCertificateAmount.plus(actorCurrentAmount),
      );

      const actor: Actor = {
        actorType,
        amount: actorAmount.toString(),
        participant,
        percentage: formatPercentage(actorAmount, totalAmount),
      };

      if (actorType === DocumentEventActorType.NETWORK) {
        networkActorKey = actorKey;
      }

      actors.set(actorKey, actor);
    }
  }

  const networkActorsKeys = [...actors.keys()].filter((actorKey) =>
    actorKey.startsWith(DocumentEventActorType.NETWORK),
  );

  if (networkActorsKeys.length > 1) {
    throw new Error(
      `Can only have one network actor. Received ${JSON.stringify(networkActorsKeys)}`,
    );
  }

  const networkActor = actors.get(networkActorKey);

  if (!networkActor) {
    throw new Error('Network actor not found when calculating rewards');
  }

  const actorsAmount = sumBigNumbers(
    [...actors.values()].map(({ amount }) => new BigNumber(amount)),
  );
  const remainderAmount = totalAmount.minus(actorsAmount);
  const networkActorAmount = remainderAmount.plus(networkActor.amount);

  actors.set(networkActorKey, {
    ...networkActor,
    amount: networkActorAmount.toString(),
    percentage: formatPercentage(networkActorAmount, totalAmount),
  });

  return {
    actors: [...actors.values()],
    massTotalValue: massTotalValue.toString(),
    remainder: {
      amount: remainderAmount.toString(),
      percentage: formatPercentage(remainderAmount, totalAmount),
    },
    unitPrice,
  };
};
