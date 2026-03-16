import type { RuleDefinition } from '@carrot-fndn/shared/rule/types';

import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that all participants in the MassID document have valid accreditation documents with active dates, ensuring proper supply chain certification.',
  events: [DocumentEventName.ACTOR],
  frameworkRules: ['check-participants-accreditation'],
  name: 'Participant Accreditations & Verifications Requirements',
  slug: 'participant-accreditations-and-verifications-requirements',
} as const satisfies RuleDefinition;
