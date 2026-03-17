import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/mass-id-qualifications';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'document-category',
    'document-measurement-unit',
    'document-subtype',
    'document-type',
    'document-value',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
