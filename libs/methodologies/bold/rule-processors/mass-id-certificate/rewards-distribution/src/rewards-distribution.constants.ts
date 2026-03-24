import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  MASS_ID,
  METHODOLOGY_DEFINITION,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type MassIDOrganicSubtype,
  RewardsDistributionActorType,
  type RewardsDistributionWasteType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import BigNumber from 'bignumber.js';

import { type RewardsDistribution } from './rewards-distribution.types';

export const LARGE_REVENUE_BUSINESS_DISCOUNT = 0.5;

export const REQUIRED_ACTOR_TYPES: {
  MASS_ID: RewardsDistributionActorType[];
  METHODOLOGY: RewardsDistributionActorType[];
} = {
  MASS_ID: [
    RewardsDistributionActorType.Recycler,
    RewardsDistributionActorType.Processor,
    RewardsDistributionActorType.Integrator,
  ],
  METHODOLOGY: [
    RewardsDistributionActorType['Community Impact Pool'],
    RewardsDistributionActorType['Methodology Author'],
    RewardsDistributionActorType['Methodology Developer'],
    RewardsDistributionActorType.Network,
  ],
};

export const REWARDS_DISTRIBUTION: RewardsDistribution = {
  'Mixed Organic Waste': {
    'Community Impact Pool': BigNumber(0),
    Hauler: BigNumber(0.1),
    Integrator: BigNumber(0.08),
    'Methodology Author': BigNumber(0.01),
    'Methodology Developer': BigNumber(0.01),
    Network: BigNumber(0.2),
    Processor: BigNumber(0.1),
    Recycler: BigNumber(0.2),
    'Waste Generator': BigNumber(0.3),
  },
  'Sludge from Waste Treatment': {
    'Community Impact Pool': BigNumber(0),
    Hauler: BigNumber(0.05),
    Integrator: BigNumber(0.08),
    'Methodology Author': BigNumber(0.01),
    'Methodology Developer': BigNumber(0.01),
    Network: BigNumber(0.2),
    Processor: BigNumber(0.1),
    Recycler: BigNumber(0.3),
    'Waste Generator': BigNumber(0.25),
  },
  'Tobacco Industry Residues': {
    'Community Impact Pool': BigNumber(0),
    Hauler: BigNumber(0.05),
    Integrator: BigNumber(0.08),
    'Methodology Author': BigNumber(0.01),
    'Methodology Developer': BigNumber(0.01),
    Network: BigNumber(0.2),
    Processor: BigNumber(0.1),
    Recycler: BigNumber(0.3),
    'Waste Generator': BigNumber(0.25),
  },
};

export const REWARDS_DISTRIBUTION_BY_WASTE_TYPE: Record<
  MassIDOrganicSubtype,
  RewardsDistributionWasteType
> = {
  'Domestic Sludge': 'Sludge from Waste Treatment',
  'EFB similar to Garden, Yard and Park Waste': 'Mixed Organic Waste',
  'Food, Food Waste and Beverages': 'Mixed Organic Waste',
  'Garden, Yard and Park Waste': 'Mixed Organic Waste',
  'Industrial Sludge': 'Sludge from Waste Treatment',
  'Others (if organic)': 'Mixed Organic Waste',
  Tobacco: 'Tobacco Industry Residues',
  'Wood and Wood Products': 'Mixed Organic Waste',
};

export const REWARDS_DISTRIBUTION_CRITERIA: DocumentCriteria = {
  relatedDocuments: [
    METHODOLOGY_DEFINITION.match,
    MASS_ID.match,
    PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match,
  ],
};
