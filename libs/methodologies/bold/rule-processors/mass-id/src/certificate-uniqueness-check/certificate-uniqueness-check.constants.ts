import type { DocumentCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';

import {
  CREDITS,
  DocumentMatcher,
  MASS_ID_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
} from '@carrot-fndn/shared/methodologies/bold/types';

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

export const METHODOLOGY_NAME_BY_SLUG = {
  [BoldMethodologySlug.CARBON]: BoldMethodologyName.CARBON,
  [BoldMethodologySlug.RECYCLING]: BoldMethodologyName.RECYCLING,
} as const satisfies Record<BoldMethodologySlug, BoldMethodologyName>;
