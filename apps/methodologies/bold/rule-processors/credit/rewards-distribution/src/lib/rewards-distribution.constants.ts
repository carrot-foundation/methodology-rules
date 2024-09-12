import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/io-helpers';

import {
  CREDIT_CERTIFICATES,
  MASS,
  MASS_AUDIT,
  MASS_CERTIFICATE,
  MASS_CERTIFICATE_AUDIT,
} from '@carrot-fndn/methodologies/bold/matchers';

export const MASS_CERTIFICATE_AUDIT_CRITERIA: DocumentCriteria = {
  relatedDocuments: [
    {
      ...CREDIT_CERTIFICATES.match,
      omit: true,
      relatedDocuments: [MASS_CERTIFICATE_AUDIT.match],
    },
  ],
};

export const MASS_CRITERIA: DocumentCriteria = {
  parentDocument: {
    ...MASS_CERTIFICATE.match,
    omit: true,
    relatedDocuments: [
      {
        ...MASS_AUDIT.match,
        omit: true,
        parentDocument: MASS.match,
      },
    ],
  },
};
