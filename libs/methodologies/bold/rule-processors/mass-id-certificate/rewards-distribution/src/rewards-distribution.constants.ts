import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  MASS_ID,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  MassIDOrganicSubtype,
  RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import { type RewardsDistribution } from './rewards-distribution.types';

const {
  COMMUNITY_IMPACT_POOL,
  HAULER,
  INTEGRATOR,
  METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER,
  NETWORK,
  PROCESSOR,
  RECYCLER,
  WASTE_GENERATOR,
} = RewardsDistributionActorType;

export const LARGE_REVENUE_BUSINESS_DISCOUNT = 0.5;

export const REQUIRED_ACTOR_TYPES = {
  MASS_ID: [RECYCLER, PROCESSOR, INTEGRATOR],
  METHODOLOGY: [
    COMMUNITY_IMPACT_POOL,
    METHODOLOGY_AUTHOR,
    METHODOLOGY_DEVELOPER,
    NETWORK,
  ],
};

export const REWARDS_DISTRIBUTION: RewardsDistribution = {
  [RewardsDistributionWasteType.MIXED_ORGANIC_WASTE]: {
    [COMMUNITY_IMPACT_POOL]: BigNumber(0),
    [HAULER]: BigNumber(0.1),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.2),
    [WASTE_GENERATOR]: BigNumber(0.3),
  },
  [RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT]: {
    [COMMUNITY_IMPACT_POOL]: BigNumber(0),
    [HAULER]: BigNumber(0.05),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.3),
    [WASTE_GENERATOR]: BigNumber(0.25),
  },
  [RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES]: {
    [COMMUNITY_IMPACT_POOL]: BigNumber(0),
    [HAULER]: BigNumber(0.05),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.3),
    [WASTE_GENERATOR]: BigNumber(0.25),
  },
};

export const REWARDS_DISTRIBUTION_BY_WASTE_TYPE: Record<
  MassIDOrganicSubtype,
  RewardsDistributionWasteType
> = {
  [MassIDOrganicSubtype.DOMESTIC_SLUDGE]:
    RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT,
  [MassIDOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIDOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIDOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIDOrganicSubtype.INDUSTRIAL_SLUDGE]:
    RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT,
  [MassIDOrganicSubtype.TOBACCO]:
    RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES,
  [MassIDOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
};

export const REWARDS_DISTRIBUTION_CRITERIA: DocumentCriteria = {
  relatedDocuments: [METHODOLOGY_DEFINITION.match, MASS_ID.match],
};
