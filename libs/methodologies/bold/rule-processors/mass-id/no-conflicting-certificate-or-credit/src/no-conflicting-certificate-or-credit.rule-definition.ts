import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Validates that the MassID document is not already linked to a valid RecycledID certificate or credit order document, preventing duplicate credit generation from the same waste mass.',
  events: [],
  name: 'Certificate Uniqueness Check',
  slug: 'no-conflicting-certificate-or-credit',
} as const satisfies BaseRuleDefinition;
