import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the Drop-off event includes a receiving operator identifier and that the Drop-off address matches the Recycler ACTOR event address.',
  events: [DocumentEventName.ACTOR, DocumentEventName.DROP_OFF],
  name: 'Drop-off At Recycling Facility',
  slug: 'drop-off-at-recycler',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
