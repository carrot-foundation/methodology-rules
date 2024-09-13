import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/io-helpers';

import {
  MASS_AUDIT,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/methodologies/bold/matchers';
import {
  DocumentEventActorType,
  MassSubtype,
} from '@carrot-fndn/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import type { RewardsDistribution } from './rewards-distribution.types';

const {
  APPOINTED_NGO,
  HAULER,
  INTEGRATOR,
  METHODOLOGY_AUTHOR,
  METHODOLOGY_DEVELOPER,
  NETWORK,
  PROCESSOR,
  RECYCLER,
  SOURCE,
} = DocumentEventActorType;

export const REQUIRED_ACTOR_TYPES = {
  MASS: [SOURCE, RECYCLER, PROCESSOR, INTEGRATOR],
  METHODOLOGY: [
    APPOINTED_NGO,
    METHODOLOGY_AUTHOR,
    METHODOLOGY_DEVELOPER,
    NETWORK,
  ],
};

export const REWARDS_DISTRIBUTION: RewardsDistribution = {
  FOOD_WASTE: {
    [APPOINTED_NGO]: BigNumber(0),
    [HAULER]: BigNumber(0.1),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.2),
    [SOURCE]: BigNumber(0.3),
  },
  OTHER_ORGANIC_WASTE: {
    [APPOINTED_NGO]: BigNumber(0),
    [HAULER]: BigNumber(0.1),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.2),
    [SOURCE]: BigNumber(0.3),
  },
  SLUDGE: {
    [APPOINTED_NGO]: BigNumber(0),
    [HAULER]: BigNumber(0.05),
    [INTEGRATOR]: BigNumber(0.08),
    [METHODOLOGY_AUTHOR]: BigNumber(0.01),
    [METHODOLOGY_DEVELOPER]: BigNumber(0.01),
    [NETWORK]: BigNumber(0.2),
    [PROCESSOR]: BigNumber(0.1),
    [RECYCLER]: BigNumber(0.3),
    [SOURCE]: BigNumber(0.25),
  },
};

export enum RewardsDistributionWasteType {
  FOOD_WASTE = 'FOOD_WASTE',
  OTHER_ORGANIC_WASTE = 'OTHER_ORGANIC_WASTE',
  SLUDGE = 'SLUDGE',
}

export const REWARDS_DISTRIBUTION_BY_WASTE_TYPE: Record<
  MassSubtype,
  RewardsDistributionWasteType
> = {
  [MassSubtype.AGRO_INDUSTRIAL]:
    RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.ANIMAL_MANURE]: RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.ANIMAL_WASTE_MANAGEMENT]:
    RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.DOMESTIC_SLUDGE]: RewardsDistributionWasteType.SLUDGE,
  [MassSubtype.FOOD_WASTE]: RewardsDistributionWasteType.FOOD_WASTE,
  [MassSubtype.GARDEN_AND_PARK_WASTE]:
    RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.INDUSTRIAL_FOOD_WASTE]: RewardsDistributionWasteType.FOOD_WASTE,
  [MassSubtype.INDUSTRIAL_SLUDGE]: RewardsDistributionWasteType.SLUDGE,
  [MassSubtype.OTHER_NON_DANGEROUS_ORGANICS]:
    RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.WOOD]: RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
  [MassSubtype.WOOD_AND_WOOD_PRODUCTS]:
    RewardsDistributionWasteType.OTHER_ORGANIC_WASTE,
};

export const REWARDS_DISTRIBUTION_CRITERIA: DocumentCriteria = {
  parentDocument: {
    relatedDocuments: [
      {
        omit: true,
        parentDocument: {},
        ...MASS_AUDIT.match,
      },
    ],
  },
  relatedDocuments: [METHODOLOGY_DEFINITION.match],
};
