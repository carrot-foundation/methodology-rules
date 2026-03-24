import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  CREDIT_ORDER_MATCH,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
  DocumentCategory,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const buildDocumentsCriteria = (
  massIDCertificateMatcher: DocumentMatcher,
): DocumentCriteria => ({
  parentDocument: {
    omit: true,
    relatedDocuments: [
      MASS_ID_AUDIT.match,
      {
        ...massIDCertificateMatcher.match,
        relatedDocuments: [CREDIT_ORDER_MATCH.match],
      },
    ],
  },
});

export const RESULT_COMMENTS = {
  failed: {},
  passed: {
    NO_CONFLICTING_CERTIFICATE: `The ${DocumentCategory.MassID} is not linked to a valid ${DocumentCategory.MassID} Certificate`,
  },
  reviewRequired: {},
} as const;

export const METHODOLOGY_NAME_BY_SLUG = {
  [BoldMethodologySlug['bold-carbon']]: BoldMethodologyName['BOLD Carbon'],
  [BoldMethodologySlug['bold-recycling']]:
    BoldMethodologyName['BOLD Recycling'],
} as const satisfies Record<BoldMethodologySlug, BoldMethodologyName>;
