import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that all participants in the MassID document have valid accreditation documents with active dates and no duplicate accreditations of the same type.',
  events: [BoldDocumentEventName.ACTOR],
  name: 'Participant Accreditations & Verifications Requirements',
  slug: 'participant-accreditations-and-verifications-requirements',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition;
