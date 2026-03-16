import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that processor actor events in the MassID document are properly identified, ensuring correct waste processing tracking.',
  events: [DocumentEventName.ACTOR],
  frameworkRules: ['processor-and-drop-off'],
  name: 'Processor Identification',
  slug: 'processor-identification',
} as const satisfies RuleDefinition;
