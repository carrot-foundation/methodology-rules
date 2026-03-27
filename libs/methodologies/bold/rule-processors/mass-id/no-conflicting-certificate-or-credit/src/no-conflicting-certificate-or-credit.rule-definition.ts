import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Validates that the MassID document is not already linked to a valid certificate or credit order document and that no other audit for the same methodology is in progress, preventing duplicate credit generation.',
  events: [],
  name: 'Certificate Uniqueness Check',
  slug: 'no-conflicting-certificate-or-credit',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
