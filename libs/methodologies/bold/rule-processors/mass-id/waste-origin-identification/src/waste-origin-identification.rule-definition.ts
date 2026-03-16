import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates waste origin identification consistency, ensuring that identified origins have exactly one waste generator actor event and unidentified origins have none.',
  events: [
    DocumentEventName.ACTOR,
    DocumentEventName.PICK_UP,
    DocumentEventName.WASTE_GENERATOR,
  ],
  frameworkRules: [
    'fip-address',
    'first-identified-participant-fip',
    'one-waste-source',
    'waste-origin-identified',
  ],
  name: 'Waste Origin Identification',
  slug: 'waste-origin-identification',
} as const satisfies RuleDefinition;
