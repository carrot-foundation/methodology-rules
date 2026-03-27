import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/weighing';

export const ruleDefinition = {
  ...baseRuleDefinition,
  methodologyFrameworkRules: [
    'container-type',
    'net-weight-verification',
    'scale-accreditation',
    'scale-type',
    'truck-weighing',
    'weight-capture-method',
    'weighing-fields',
    'weighing-in-two-steps',
  ],
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
