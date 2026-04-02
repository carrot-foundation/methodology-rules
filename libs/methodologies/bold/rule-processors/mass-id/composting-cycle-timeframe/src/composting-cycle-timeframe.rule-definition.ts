import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the time between Drop-off and Recycled events is within the acceptable range of 60 to 180 days for composting cycles.',
  events: [BoldDocumentEventName.DROP_OFF, BoldDocumentEventName.RECYCLED],
  name: 'Composting Cycle Timeframe',
  slug: 'composting-cycle-timeframe',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
