import type { FrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-recycling/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';

export const ruleDefinition = {
  ...baseRuleDefinition,
  frameworkRules: [
    'has-recycling-manifest',
    'has-transport-manifest',
    'recycling-manifest-address',
    'recycling-manifest-attachment',
    'recycling-manifest-exemption-justification',
    'recycling-manifest-fields',
    'recycling-manifest-value',
    'transport-manifest-attachment',
    'transport-manifest-exemption-justification',
    'transport-manifest-fields',
  ],
} as const satisfies RuleDefinition<FrameworkRuleSlug>;
