import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/prevented-emissions';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: ['gas-id-output', 'recycled-to-input-conversion'],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
