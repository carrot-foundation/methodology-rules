import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/io-helpers';

import {
  CERTIFICATE_AUDIT,
  CREDIT_CERTIFICATES,
  MASS_VALIDATION,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/methodologies/bold/matchers';

export const NFT_METADATA_SELECTION_CRITERIA: DocumentCriteria = {
  relatedDocuments: [
    METHODOLOGY_DEFINITION.match,
    {
      ...CREDIT_CERTIFICATES,
      relatedDocuments: [
        {
          ...CERTIFICATE_AUDIT.match,
          parentDocument: {
            relatedDocuments: [
              {
                ...MASS_VALIDATION.match,
                parentDocument: {},
              },
            ],
          },
        },
      ],
    },
  ],
};
