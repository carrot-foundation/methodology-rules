import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that exactly one Processor ACTOR event exists in the MassID document, ensuring proper processor identification in the waste processing chain.',
  events: [DocumentEventName.ACTOR],
  name: 'Processor Identification',
  slug: 'processor-identification',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
