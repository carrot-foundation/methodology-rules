import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that event addresses for all participants are within 2000 meters of their accredited addresses, ensuring geographic consistency between declared locations and accreditations.',
  events: [DocumentEventName.DROP_OFF, DocumentEventName.PICK_UP],
  name: 'Geolocation Precision',
  slug: 'geolocation-and-address-precision',
} as const satisfies BaseRuleDefinition;
