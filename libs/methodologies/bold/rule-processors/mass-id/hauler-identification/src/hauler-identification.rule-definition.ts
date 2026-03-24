import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates hauler identification based on the vehicle type, requiring a Hauler ACTOR event for most vehicle types while making it optional for sludge pipes and cart.',
  events: [DocumentEventName.ACTOR, DocumentEventName['Pick-up']],
  name: 'Hauler Identification',
  slug: 'hauler-identification',
} as const satisfies BaseRuleDefinition;
