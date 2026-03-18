import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the time between drop-off and recycled events is within the acceptable range of 60 to 180 days for composting cycles.',
  events: [DocumentEventName.DROP_OFF, DocumentEventName.RECYCLED],
  name: 'Composting Cycle Timeframe',
  slug: 'composting-cycle-timeframe',
} as const satisfies BaseRuleDefinition;
