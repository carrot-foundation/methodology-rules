import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates event addresses against accredited addresses using tiered distance thresholds: ≤2 km passes with GPS check, 2–30 km requires address similarity review, >30 km fails. For recyclers, also validates GPS coordinates against the accredited address when available.',
  events: [DocumentEventName.DROP_OFF, DocumentEventName.PICK_UP],
  name: 'Geolocation Precision',
  slug: 'geolocation-and-address-precision',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
