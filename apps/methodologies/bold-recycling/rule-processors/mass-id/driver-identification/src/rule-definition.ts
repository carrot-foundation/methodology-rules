import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/driver-identification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: ['driver-identifier'],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
