import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates waste origin identification consistency, ensuring that identified origins have exactly one Waste Generator ACTOR event and unidentified origins have none.',
  events: [
    DocumentEventName.ACTOR,
    DocumentEventName.PICK_UP,
    DocumentEventName.WASTE_GENERATOR,
  ],
  name: 'Waste Origin Identification',
  slug: 'waste-origin-identification',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
