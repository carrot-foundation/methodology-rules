import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Validates that the MassID document has the correct qualifications: category must be MassID, type must be Organic, measurement unit must be kg, value must be greater than zero, and subtype must be a valid organic waste subtype.',
  events: [],
  name: 'MassID Qualifications',
  slug: 'mass-id-qualifications',
} as const satisfies BaseRuleDefinition;
