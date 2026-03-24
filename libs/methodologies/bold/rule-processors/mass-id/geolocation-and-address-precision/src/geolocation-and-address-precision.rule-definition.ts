import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that event addresses for all participants are within 2000 meters of their accredited addresses. For recyclers, also validates GPS coordinates against the accredited address when available.',
  events: [DocumentEventName['Drop-off'], DocumentEventName['Pick-up']],
  name: 'Geolocation Precision',
  slug: 'geolocation-and-address-precision',
} as const satisfies BaseRuleDefinition;
