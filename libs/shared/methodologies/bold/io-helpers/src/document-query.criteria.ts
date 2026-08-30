import { PARTICIPANT_ACCREDITATION_PARTIAL_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';

import type { DocumentQueryCriteria } from './document-query.service.types';

export const RELATED_DOCUMENT_CRITERIA = {
  parentDocument: {},
  relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
} as const satisfies DocumentQueryCriteria;
