import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/composting-cycle-timeframe';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['time-interval-check'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
