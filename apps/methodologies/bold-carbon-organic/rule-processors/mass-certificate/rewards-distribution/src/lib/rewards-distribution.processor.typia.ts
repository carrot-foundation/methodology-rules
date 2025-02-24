import type {
  MassSubtype,
  RewardsDistributionActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { createIs } from 'typia';

export const isMassSubtype = createIs<MassSubtype>();
export const isRewardsDistributionActorType =
  createIs<RewardsDistributionActorType>();
