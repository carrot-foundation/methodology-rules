import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/geolocation-and-address-precision';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: [
    'drop-off-geolocation-precision',
    'pick-up-geolocation-precision',
  ],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
