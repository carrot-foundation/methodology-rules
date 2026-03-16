import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Calculates reward distribution in USDC for participants that contributed to the circular economy cycle in credit order documents.',
  events: [],
  frameworkRules: [],
  name: 'Rewards Distribution',
  slug: 'rewards-distribution',
} as const satisfies RuleDefinition;
