import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: ['trc-absence'],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
