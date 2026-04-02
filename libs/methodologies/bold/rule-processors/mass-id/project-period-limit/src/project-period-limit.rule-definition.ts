import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the Recycled event occurred within the timeframe allowed by the methodology, ensuring only recent recycling events are eligible for credit generation.',
  events: [BoldDocumentEventName.RECYCLED],
  name: 'Project Period',
  slug: 'project-period-limit',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
