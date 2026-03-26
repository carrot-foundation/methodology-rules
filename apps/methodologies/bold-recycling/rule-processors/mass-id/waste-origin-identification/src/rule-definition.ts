import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/waste-origin-identification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: [
    'fip-address',
    'first-identified-participant-fip',
    'one-waste-source',
    'waste-origin-identified',
  ],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
