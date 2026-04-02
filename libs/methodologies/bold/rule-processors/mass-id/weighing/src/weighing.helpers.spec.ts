import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  getRequiredAdditionalVerificationsFromAccreditationDocument,
  validateTwoStepWeighingEvents,
} from './weighing.helpers';

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

  describe('validateTwoStepWeighingEvents', () => {
    it('should return an error when events array does not have exactly 2 elements', () => {
      const result = validateTwoStepWeighingEvents([]);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Expected exactly 2 weighing events');
    });
  });
});
