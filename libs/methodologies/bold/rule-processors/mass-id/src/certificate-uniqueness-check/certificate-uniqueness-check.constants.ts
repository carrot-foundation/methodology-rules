import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  CREDITS,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';

export const buildDocumentsCriteria = (
  massIdCertificateMatcher: DocumentMatcher,
): DocumentCriteria => ({
  parentDocument: {
    omit: true,
    relatedDocuments: [
      MASS_ID_AUDIT.match,
      {
        ...massIdCertificateMatcher.match,
        relatedDocuments: [CREDITS.match],
      },
    ],
  },
});
