import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates local waste classification codes and descriptions against the official IBAMA Brazilian solid waste list, ensuring proper waste categorization for the jurisdiction.',
  events: [DocumentEventName.ACTOR, DocumentEventName.PICK_UP],
  frameworkRules: [
    'local-waste-classification',
    'local-waste-classification-x-cdm',
  ],
  name: 'Local Waste Classification',
  slug: 'regional-waste-classification',
} as const satisfies RuleDefinition;
