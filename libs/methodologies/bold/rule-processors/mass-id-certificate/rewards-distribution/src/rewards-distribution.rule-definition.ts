import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates reward distribution percentages across participant actor types based on waste characteristics, waste origin identification status, and methodology-defined reward configurations.',
  events: [BoldDocumentEventName.ACTOR],
  name: 'Rewards Distribution',
  slug: 'rewards-distribution',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
