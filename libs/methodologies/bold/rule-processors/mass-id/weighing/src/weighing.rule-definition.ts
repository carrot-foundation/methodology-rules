import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates weighing events in MassID documents, including event values, container types, capture methods, scale types, and scale ticket verification. Supports both single-step and two-step weighing processes.',
  events: [
    BoldDocumentEventName.TRANSPORT_MANIFEST,
    BoldDocumentEventName.WEIGHING,
  ],
  name: 'Weighing',
  slug: 'weighing',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
