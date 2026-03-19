import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates transport and recycling manifest events in MassID documents, ensuring they contain required attributes, proper document attachments, and valid exemption justifications. Cross-validates manifest data against extracted document content when available.',
  events: [
    DocumentEventName.ACTOR,
    DocumentEventName.DROP_OFF,
    DocumentEventName.PICK_UP,
    DocumentEventName.RECYCLING_MANIFEST,
    DocumentEventName.TRANSPORT_MANIFEST,
    DocumentEventName.WEIGHING,
  ],
  name: 'Document Manifest Data',
  slug: 'document-manifest-data',
} as const satisfies BaseRuleDefinition;
