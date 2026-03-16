import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates hauler identification based on the vehicle type, requiring a hauler actor event for most vehicle types while making it optional for sludge pipes and cart.',
  events: [DocumentEventName.ACTOR, DocumentEventName.PICK_UP],
  frameworkRules: ['hauler-identification'],
  name: 'Hauler Identification',
  slug: 'hauler-identification',
} as const satisfies RuleDefinition;
