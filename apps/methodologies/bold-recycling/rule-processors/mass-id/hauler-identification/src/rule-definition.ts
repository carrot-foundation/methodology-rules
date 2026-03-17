import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/hauler-identification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['hauler-identification'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
