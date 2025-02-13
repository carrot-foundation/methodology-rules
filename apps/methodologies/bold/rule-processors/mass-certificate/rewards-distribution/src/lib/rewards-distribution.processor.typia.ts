import type {
  MassSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import type BigNumber from 'bignumber.js';

import { createIs } from 'typia';

export const isMassSubtype = createIs<MassSubtype>();
export const isRewardsDistributionActorType =
  createIs<RewardsDistributionActorType>();
export const isBigNumber = createIs<BigNumber>();
