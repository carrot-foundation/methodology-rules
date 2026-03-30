import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';

export const ruleDefinition = {
  ...baseRuleDefinition,
  description:
    'Validates recycling manifest events in MassID documents, ensuring they contain required attributes, proper attachments, and valid exemption justifications.',
  methodologyFrameworkRules: [
    'has-recycling-manifest',
    'recycling-manifest-address',
    'recycling-manifest-attachment',
    'recycling-manifest-exemption-justification',
    'recycling-manifest-fields',
    'recycling-manifest-value',
  ],
  name: 'Recycling Manifest Data',
  slug: 'recycling-manifest-data',
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
