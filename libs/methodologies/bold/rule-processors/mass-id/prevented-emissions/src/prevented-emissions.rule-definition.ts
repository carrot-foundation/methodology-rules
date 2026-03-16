import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates prevented emissions in kg CO2e based on the waste subtype, recycler accreditation baselines, and exceeding emission coefficient.',
  events: [DocumentEventName.PICK_UP],
  frameworkRules: ['gas-id-output', 'recycled-to-input-conversion'],
  name: 'Prevented Emissions',
  slug: 'prevented-emissions',
} as const satisfies RuleDefinition;
