import type { DocumentCriteria } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';

import {
  CREDIT_CERTIFICATES,
  MASS_AUDIT,
  MASS_CERTIFICATE_AUDIT,
  METHODOLOGY_DEFINITION,
} from '@carrot-fndn/methodologies/bold/recycling/organic/matchers';

export const NFT_METADATA_SELECTION_CRITERIA: DocumentCriteria = {
  relatedDocuments: [
    METHODOLOGY_DEFINITION.match,
    {
      ...CREDIT_CERTIFICATES,
      relatedDocuments: [
        {
          ...MASS_CERTIFICATE_AUDIT.match,
          parentDocument: {
            relatedDocuments: [
              {
                ...MASS_AUDIT.match,
                parentDocument: {},
              },
            ],
          },
        },
      ],
    },
  ],
};
