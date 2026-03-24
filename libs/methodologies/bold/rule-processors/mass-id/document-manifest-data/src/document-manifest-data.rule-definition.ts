import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates transport and recycling manifest events in MassID documents, ensuring they contain required attributes, proper document attachments, and valid exemption justifications. Cross-validates manifest data against extracted document content when available.',
  events: [
    DocumentEventName.ACTOR,
    DocumentEventName['Drop-off'],
    DocumentEventName['Pick-up'],
    DocumentEventName['Recycling Manifest'],
    DocumentEventName['Transport Manifest'],
    DocumentEventName.Weighing,
  ],
  name: 'Document Manifest Data',
  slug: 'document-manifest-data',
} as const satisfies BaseRuleDefinition;
