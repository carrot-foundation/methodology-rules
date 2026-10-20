import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates each Waste Manager of the MassID against the connection evidence frozen by Smaug before the audit: declared actors need an eligible connection in force on the Drop-Off day in America/Sao_Paulo (start inclusive, end exclusive), eligible connections without an actor are recorded as derived beneficiaries, and incomplete connection history goes to review.',
  events: [BoldDocumentEventName.ACTOR, BoldDocumentEventName.DROP_OFF],
  name: 'Waste Manager Connection',
  slug: 'waste-manager-connection',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
