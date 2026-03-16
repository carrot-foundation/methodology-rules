import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

export const ruleDefinition = {
  description:
    'Validates that the MassID document has the correct qualifications: category must be MassID, type must be Organic, measurement unit must be kg, value must be greater than zero, and subtype must be a valid organic waste subtype.',
  events: [],
  frameworkRules: [
    'document-category',
    'document-measurement-unit',
    'document-subtype',
    'document-type',
    'document-value',
  ],
  name: 'Mass ID Qualifications',
  slug: 'mass-id-qualifications',
} as const satisfies RuleDefinition;
