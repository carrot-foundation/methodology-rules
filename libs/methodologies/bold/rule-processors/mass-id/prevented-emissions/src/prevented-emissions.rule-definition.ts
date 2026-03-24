import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Calculates prevented emissions in kg CO2e based on the waste subtype, recycler accreditation baselines, exceeding emission coefficient, and gas type configuration.',
  events: [DocumentEventName['Pick-up']],
  name: 'Prevented Emissions',
  slug: 'prevented-emissions',
} as const satisfies BaseRuleDefinition;
