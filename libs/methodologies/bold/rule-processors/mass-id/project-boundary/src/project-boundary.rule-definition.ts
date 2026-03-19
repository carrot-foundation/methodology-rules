import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates and validates the distance between the Pick-up and Drop-off event addresses, determining the geographic scope of the waste collection and processing activity.',
  events: [DocumentEventName.DROP_OFF, DocumentEventName.PICK_UP],
  name: 'Project Boundary',
  slug: 'project-boundary',
} as const satisfies BaseRuleDefinition;
