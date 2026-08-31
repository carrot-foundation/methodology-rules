import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import {
  type DocumentQueryCriteria,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';

export const ruleDefinition = {
  description:
    'Validates sorting events in MassID documents, ensuring that gross weight, deducted weight, sorting factor, and event values are correctly calculated and formatted.',
  events: [BoldDocumentEventName.SORTING],
  input: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
  name: 'Mass Sorting',
  slug: 'mass-id-sorting',
  version: '1.0.0',
} as const satisfies BaseRuleDefinition<DocumentQueryCriteria>;
