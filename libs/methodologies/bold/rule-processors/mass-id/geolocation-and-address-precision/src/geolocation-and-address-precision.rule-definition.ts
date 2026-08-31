import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import {
  type DocumentQueryCriteria,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates event addresses against accredited addresses using tiered distance thresholds: ≤2 km passes with GPS check, 2–30 km requires address similarity review, >30 km fails. For recyclers, also validates GPS coordinates against the accredited address when available.',
  events: [BoldDocumentEventName.DROP_OFF, BoldDocumentEventName.PICK_UP],
  input: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  name: 'Geolocation Precision',
  slug: 'geolocation-and-address-precision',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
