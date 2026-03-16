import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that no duplicate MassID documents exist with the same combination of drop-off event, pick-up event, recycler event, waste generator event, and vehicle license plate.',
  events: [
    DocumentEventName.ACTOR,
    DocumentEventName.DROP_OFF,
    DocumentEventName.PICK_UP,
  ],
  frameworkRules: [
    'double-checking-recycler-emitted-masses',
    'double-checking-source-emitted-masses',
    'duplicate-check',
    'route-check',
  ],
  name: 'Uniqueness Check',
  slug: 'waste-mass-is-unique',
} as const satisfies RuleDefinition;
