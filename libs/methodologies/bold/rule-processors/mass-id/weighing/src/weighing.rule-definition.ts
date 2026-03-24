import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates weighing events in MassID documents, including event values, container types, capture methods, scale types, and scale ticket verification. Supports both single-step and two-step weighing processes.',
  events: [DocumentEventName['Transport Manifest'], DocumentEventName.Weighing],
  name: 'Weighing',
  slug: 'weighing',
} as const satisfies BaseRuleDefinition;
