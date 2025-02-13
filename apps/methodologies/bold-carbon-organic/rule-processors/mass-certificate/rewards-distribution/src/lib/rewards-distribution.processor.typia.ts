import type {
  MassSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';

import { createIs } from 'typia';

export const isMassSubtype = createIs<MassSubtype>();
export const isRewardsDistributionActorType =
  createIs<RewardsDistributionActorType>();
