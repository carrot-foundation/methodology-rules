import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates transport and recycling manifest events in MassID documents, ensuring they contain required attributes, proper document attachments, and valid exemption justifications. Cross-validates manifest data against extracted document content when available.',
  events: [
    BoldDocumentEventName.ACTOR,
    BoldDocumentEventName.DROP_OFF,
    BoldDocumentEventName.PICK_UP,
    BoldDocumentEventName.RECYCLING_MANIFEST,
    BoldDocumentEventName.TRANSPORT_MANIFEST,
    BoldDocumentEventName.WEIGHING,
  ],
  name: 'Document Manifest Data',
  slug: 'document-manifest-data',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
