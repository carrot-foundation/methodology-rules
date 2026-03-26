import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/mass-id-sorting';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: [
    'mass-sorting-event',
    'sorting-calculation',
    'sorting-value-field',
  ],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
