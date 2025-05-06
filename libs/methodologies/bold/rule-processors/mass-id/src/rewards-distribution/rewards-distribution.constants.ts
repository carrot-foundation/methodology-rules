import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  MASS_ID_AUDIT,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  MassIdOrganicSubtype,
  RewardsDistributionActorType,
  RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import { type RewardsDistribution } from './rewards-distribution.types';

const {
  APPOINTED_NGO,
  HAULER,
  INTEGRATOR,
  METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER,
  NETWORK,
  PROCESSOR,
  RECYCLER,
  WASTE_GENERATOR,
} = RewardsDistributionActorType;

export const REQUIRED_ACTOR_TYPES = {
  MASS_ID: [RECYCLER, PROCESSOR, INTEGRATOR],
  METHODOLOGY: [
    APPOINTED_NGO,
    METHODOLOGY_AUTHOR,
    METHODOLOGY_DEVELOPER,
    NETWORK,
  ],
};

export const REWARDS_DISTRIBUTION: RewardsDistribution = {
  [RewardsDistributionWasteType.MIXED_ORGANIC_WASTE]: {
    [APPOINTED_NGO]: BigNumber(0),
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
    [APPOINTED_NGO]: BigNumber(0),
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
    [APPOINTED_NGO]: BigNumber(0),
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
  MassIdOrganicSubtype,
  RewardsDistributionWasteType
> = {
  [MassIdOrganicSubtype.DOMESTIC_SLUDGE]:
    RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT,
  [MassIdOrganicSubtype.EFB_SIMILAR_TO_GARDEN_YARD_AND_PARK_WASTE]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIdOrganicSubtype.FOOD_FOOD_WASTE_AND_BEVERAGES]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIdOrganicSubtype.GARDEN_YARD_AND_PARK_WASTE]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIdOrganicSubtype.INDUSTRIAL_SLUDGE]:
    RewardsDistributionWasteType.SLUDGE_FROM_WASTE_TREATMENT,
  [MassIdOrganicSubtype.PULP_PAPER_AND_CARDBOARD]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
  [MassIdOrganicSubtype.TOBACCO]:
    RewardsDistributionWasteType.TOBACCO_INDUSTRY_RESIDUES,
  [MassIdOrganicSubtype.WOOD_AND_WOOD_PRODUCTS]:
    RewardsDistributionWasteType.MIXED_ORGANIC_WASTE,
};

export const REWARDS_DISTRIBUTION_CRITERIA: DocumentCriteria = {
  parentDocument: {
    relatedDocuments: [
      {
        omit: true,
        parentDocument: {},
        ...MASS_ID_AUDIT.match,
      },
    ],
  },
  relatedDocuments: [METHODOLOGY_DEFINITION.match],
};
