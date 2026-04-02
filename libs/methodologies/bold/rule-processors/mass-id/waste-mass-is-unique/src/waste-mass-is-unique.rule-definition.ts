import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that no duplicate MassID documents exist with the same combination of Drop-off event, Pick-up event, Recycler ACTOR event, Waste Generator ACTOR event, and vehicle license plate.',
  events: [
    BoldDocumentEventName.ACTOR,
    BoldDocumentEventName.DROP_OFF,
    BoldDocumentEventName.PICK_UP,
  ],
  name: 'Uniqueness Check',
  slug: 'waste-mass-is-unique',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
