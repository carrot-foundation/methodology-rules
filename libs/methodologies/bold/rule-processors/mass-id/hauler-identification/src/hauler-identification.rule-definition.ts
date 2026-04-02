import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates hauler identification based on the vehicle type, requiring a Hauler ACTOR event for most vehicle types while making it optional for sludge pipes and cart.',
  events: [BoldDocumentEventName.ACTOR, BoldDocumentEventName.PICK_UP],
  name: 'Hauler Identification',
  slug: 'hauler-identification',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
