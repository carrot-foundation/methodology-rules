import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates sorting events in MassID documents, ensuring that gross weight, deducted weight, sorting factor, and event values are correctly calculated and formatted.',
  events: [DocumentEventName.SORTING],
  frameworkRules: [
    'mass-sorting-event',
    'sorting-calculation',
    'sorting-value-field',
  ],
  name: 'Mass Sorting',
  slug: 'mass-id-sorting',
} as const satisfies RuleDefinition;
