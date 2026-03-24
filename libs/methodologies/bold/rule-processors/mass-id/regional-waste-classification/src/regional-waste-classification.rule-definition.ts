import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates local waste classification codes and descriptions against the official Ibama Brazilian solid waste list, verifying code existence, description accuracy, and CDM code alignment with the document subtype.',
  events: [DocumentEventName.ACTOR, DocumentEventName['Pick-up']],
  name: 'Local Waste Classification',
  slug: 'regional-waste-classification',
} as const satisfies BaseRuleDefinition;
