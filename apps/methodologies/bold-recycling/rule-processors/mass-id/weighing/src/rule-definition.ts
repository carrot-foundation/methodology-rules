import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/weighing';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'container-type',
    'net-weight-verification',
    'scale-accreditation',
    'scale-type',
    'truck-weighing',
    'weight-capture-method',
    'weighing-fields',
    'weighing-in-two-steps',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
