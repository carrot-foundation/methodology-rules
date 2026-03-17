import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/credit-order/rewards-distribution';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
