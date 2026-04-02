import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates local waste classification codes and descriptions against the official Ibama Brazilian solid waste list, verifying code existence, description accuracy, and CDM code alignment with the document subtype.',
  events: [BoldDocumentEventName.ACTOR, BoldDocumentEventName.PICK_UP],
  name: 'Local Waste Classification',
  slug: 'regional-waste-classification',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
