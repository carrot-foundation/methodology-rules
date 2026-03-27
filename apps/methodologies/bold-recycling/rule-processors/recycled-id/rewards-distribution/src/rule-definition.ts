import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id-certificate/rewards-distribution';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: [],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
