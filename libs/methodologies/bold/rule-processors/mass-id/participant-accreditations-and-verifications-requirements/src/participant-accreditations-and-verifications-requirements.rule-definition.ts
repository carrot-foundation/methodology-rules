import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import {
  type DocumentQueryCriteria,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates that the Integrator, Processor and Recycler in the MassID document have accreditation documents, requiring an approved accreditation with active dates for the Processor and Recycler, and no duplicate accreditations of the same type.',
  events: [BoldDocumentEventName.ACTOR],
  input: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  name: 'Participant Accreditations & Verifications Requirements',
  slug: 'participant-accreditations-and-verifications-requirements',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
