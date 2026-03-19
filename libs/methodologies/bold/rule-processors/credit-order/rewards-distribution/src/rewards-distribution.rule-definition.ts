import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Calculates reward distribution amounts for participants that contributed to the circular economy cycle, based on credit unit price and certificate-level reward allocations.',
  events: [],
  name: 'Rewards Distribution',
  slug: 'rewards-distribution',
} as const satisfies BaseRuleDefinition;
