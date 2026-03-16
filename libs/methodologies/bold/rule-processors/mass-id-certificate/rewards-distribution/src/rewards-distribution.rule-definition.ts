import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates reward distribution for MassID certificate documents based on actor participation, waste characteristics, and methodology configuration.',
  events: [DocumentEventName.ACTOR],
  frameworkRules: [],
  name: 'Rewards Distribution',
  slug: 'rewards-distribution',
} as const satisfies RuleDefinition;
