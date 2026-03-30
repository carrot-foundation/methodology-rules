import type { MethodologyFrameworkRuleSlug } from '@carrot-fndn/methodologies/bold-carbon/rules';
import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { ruleDefinition as baseRuleDefinition } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/document-manifest-data';

export const ruleDefinition = {
  ...baseRuleDefinition,
  description:
    'Validates transport manifest events in MassID documents, ensuring they contain required attributes, proper attachments, and valid exemption justifications.',
  methodologyFrameworkRules: [
    'has-transport-manifest',
    'transport-manifest-attachment',
    'transport-manifest-exemption-justification',
    'transport-manifest-fields',
  ],
  name: 'Transport Manifest Data',
  slug: 'transport-manifest-data',
} as const satisfies RuleDefinition<MethodologyFrameworkRuleSlug>;
