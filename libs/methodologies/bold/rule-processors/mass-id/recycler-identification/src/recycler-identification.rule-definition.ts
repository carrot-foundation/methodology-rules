import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that exactly one Recycler ACTOR event exists in the MassID document, ensuring proper recycler identification for waste tracking and credit generation.',
  events: [DocumentEventName.ACTOR],
  name: 'Recycler Identification',
  slug: 'recycler-identification',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
