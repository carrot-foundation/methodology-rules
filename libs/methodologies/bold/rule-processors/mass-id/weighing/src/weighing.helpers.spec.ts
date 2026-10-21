import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

import { getRequiredAdditionalVerificationsFromAccreditationDocument } from './weighing.helpers';

describe('weighing.helpers', () => {
  it('should return undefined when accreditation result event is missing', () => {
    const recyclerAccreditationDocument = {
      externalEvents: [],
    } as unknown as BoldDocument;

    const result = getRequiredAdditionalVerificationsFromAccreditationDocument(
      recyclerAccreditationDocument,
    );

    expect(result).toBeUndefined();
  });
});
