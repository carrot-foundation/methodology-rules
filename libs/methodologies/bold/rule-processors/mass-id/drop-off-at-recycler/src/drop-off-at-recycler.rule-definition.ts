import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the drop-off event includes a receiving operator identifier and that the drop-off address matches the recycler event address.',
  events: [DocumentEventName.ACTOR, DocumentEventName.DROP_OFF],
  frameworkRules: [
    'check-recycler-and-drop-off-addresses',
    'drop-off-event',
    'receiving-operator-identifier',
  ],
  name: 'Drop-off At Recycling Facility',
  slug: 'drop-off-at-recycler',
} as const satisfies RuleDefinition;
