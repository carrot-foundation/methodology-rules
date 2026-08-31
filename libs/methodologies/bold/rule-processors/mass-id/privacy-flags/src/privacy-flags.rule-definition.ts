import type { DocumentQueryCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BOLD_ROOT_DOCUMENT_CRITERIA } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the privacy flags declared on methodology-specified MassID events and attributes match the BOLD methodology specification.',
  events: [
    BoldDocumentEventName.ACTOR,
    BoldDocumentEventName.DROP_OFF,
    BoldDocumentEventName.PICK_UP,
    BoldDocumentEventName.RECYCLED,
    BoldDocumentEventName.RECYCLING_MANIFEST,
    BoldDocumentEventName.SORTING,
    BoldDocumentEventName.TRANSPORT_MANIFEST,
    BoldDocumentEventName.WEIGHING,
  ],
  input: BOLD_ROOT_DOCUMENT_CRITERIA,
  name: 'Privacy Flags',
  slug: 'privacy-flags',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
