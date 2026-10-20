import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/waste-manager-connection';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: ['waste-manager-connection-verified'],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
