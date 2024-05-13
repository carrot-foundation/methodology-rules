import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/io-helpers';

import {
  CERTIFICATE,
  CERTIFICATE_AUDIT,
  CREDIT_CERTIFICATES,
  MASS,
  MASS_VALIDATION,
} from '@carrot-fndn/methodologies/bold/matchers';

export const CERTIFICATE_AUDIT_CRITERIA: DocumentCriteria = {
  relatedDocuments: [
    {
      ...CREDIT_CERTIFICATES.match,
      omit: true,
      relatedDocuments: [CERTIFICATE_AUDIT.match],
    },
  ],
};

export const MASS_CRITERIA: DocumentCriteria = {
  parentDocument: {
    ...CERTIFICATE.match,
    omit: true,
    relatedDocuments: [
      {
        ...MASS_VALIDATION.match,
        omit: true,
        parentDocument: MASS.match,
      },
    ],
  },
};
