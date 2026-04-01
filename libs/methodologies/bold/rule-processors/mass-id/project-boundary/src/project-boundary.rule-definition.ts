import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates the geographic distance in kilometers between the Pick-up and Drop-off event addresses, determining the project boundary scope.',
  events: [BoldDocumentEventName.DROP_OFF, BoldDocumentEventName.PICK_UP],
  name: 'Project Boundary',
  slug: 'project-boundary',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
