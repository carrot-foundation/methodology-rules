import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that exactly one recycler actor event exists in the MassID document, ensuring proper recycler identification for waste tracking and credit generation.',
  events: [DocumentEventName.ACTOR],
  frameworkRules: ['recycler-actor'],
  name: 'Recycler Identification',
  slug: 'recycler-identification',
} as const satisfies RuleDefinition;
