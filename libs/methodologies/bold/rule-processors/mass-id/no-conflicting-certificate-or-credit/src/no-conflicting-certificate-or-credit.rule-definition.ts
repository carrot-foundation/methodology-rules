import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Validates that the MassID document is not already linked to a valid RecycledID certificate or credit order document, preventing duplicate credit generation from the same waste mass.',
  events: [],
  frameworkRules: ['tcc-absence'],
  name: 'Certificate Uniqueness Check',
  slug: 'no-conflicting-certificate-or-credit',
} as const satisfies RuleDefinition;
