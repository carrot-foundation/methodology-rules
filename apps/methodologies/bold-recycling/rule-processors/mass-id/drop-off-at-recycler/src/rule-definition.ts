import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/drop-off-at-recycler';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'check-recycler-and-drop-off-addresses',
    'drop-off-event',
    'receiving-operator-identifier',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
