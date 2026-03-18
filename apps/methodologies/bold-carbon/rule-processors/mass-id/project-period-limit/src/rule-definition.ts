import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/project-period-limit';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['audit-eligibility-check', 'project-size'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
