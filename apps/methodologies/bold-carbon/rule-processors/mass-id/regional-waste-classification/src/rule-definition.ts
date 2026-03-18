import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/regional-waste-classification';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'local-waste-classification',
    'local-waste-classification-x-cdm',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
