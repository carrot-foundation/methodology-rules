import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates weighing events in MassID documents, including event values, container types, capture methods, scale types, and scale ticket verification. Supports both single-step and two-step weighing processes.',
  events: [DocumentEventName.TRANSPORT_MANIFEST, DocumentEventName.WEIGHING],
  frameworkRules: [
    'container-type',
    'net-weight-verification',
    'scale-accreditation',
    'scale-type',
    'truck-weighing',
    'weight-capture-method',
    'weighing-fields',
    'weighing-in-two-steps',
  ],
  name: 'Weighing',
  slug: 'weighing',
} as const satisfies RuleDefinition;
