import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates vehicle identification in the Pick-up event, ensuring the appropriate identification method is used based on the vehicle type: license plate, description, or no identification required.',
  events: [DocumentEventName.PICK_UP],
  name: 'Vehicle Identification',
  slug: 'vehicle-identification',
} as const satisfies BaseRuleDefinition;
