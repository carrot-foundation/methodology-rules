import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  CREDIT_ORDER_MATCH,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
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

export const METHODOLOGY_NAME_BY_SLUG = {
  [BoldMethodologySlug.CARBON]: BoldMethodologyName.CARBON,
  [BoldMethodologySlug.RECYCLING]: BoldMethodologyName.RECYCLING,
} as const satisfies Record<BoldMethodologySlug, BoldMethodologyName>;
