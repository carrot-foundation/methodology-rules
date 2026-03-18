import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates sorting events in MassID documents, ensuring that gross weight, deducted weight, sorting factor, and event values are correctly calculated and formatted.',
  events: [DocumentEventName.SORTING],
  name: 'Mass Sorting',
  slug: 'mass-id-sorting',
} as const satisfies BaseRuleDefinition;
