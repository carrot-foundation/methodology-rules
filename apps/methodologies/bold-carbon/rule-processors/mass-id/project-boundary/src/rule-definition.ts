import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/project-boundary';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['methodology-distance-limit'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
