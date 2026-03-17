import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/processor-identification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['processor-and-drop-off'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
