import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/waste-mass-is-unique';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'double-checking-recycler-emitted-masses',
    'double-checking-source-emitted-masses',
    'duplicate-check',
    'route-check',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
