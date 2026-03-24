import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates the geographic distance in kilometers between the Pick-up and Drop-off event addresses, determining the project boundary scope.',
  events: [DocumentEventName['Drop-off'], DocumentEventName['Pick-up']],
  name: 'Project Boundary',
  slug: 'project-boundary',
} as const satisfies BaseRuleDefinition;
