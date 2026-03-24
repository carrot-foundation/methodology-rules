import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates driver identification in the Pick-up event, ensuring either a driver identifier or an exemption justification is provided based on the vehicle type.',
  events: [DocumentEventName['Pick-up']],
  name: 'Driver Identification',
  slug: 'driver-identification',
} as const satisfies BaseRuleDefinition;
