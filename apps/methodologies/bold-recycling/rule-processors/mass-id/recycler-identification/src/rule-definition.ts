import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/recycler-identification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['recycler-actor'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
