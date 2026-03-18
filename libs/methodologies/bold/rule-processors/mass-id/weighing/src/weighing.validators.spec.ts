import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyApprovedExceptionType,
  type MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';

import {
  isAdditionalVerificationAttributeValue,
  isMethodologyAdditionalVerification,
} from './weighing.validators';

describe('weighing.validators', () => {
  describe('isMethodologyAdditionalVerification', () => {
    it('should return true for a valid additional verification object', () => {
      expect(
        isMethodologyAdditionalVerification({
          'Layout IDs': ['layout-1'],
          'Verification Type': 'MANUAL_REVIEW',
        }),
      ).toBe(true);
    });

    it('should return false when verification type is missing', () => {
      expect(
        isMethodologyAdditionalVerification({
          'Layout IDs': ['layout-1'],
        }),
      ).toBe(false);
    });
  });

  describe('isAdditionalVerificationAttributeValue', () => {
    it('should return true for a valid list of additional verifications', () => {
      const value: MethodologyAdditionalVerificationAttributeValue = [
        {
          'Layout IDs': ['layout-1'],
          'Verification Type': 'MANUAL_REVIEW',
        },
      ];

      expect(isAdditionalVerificationAttributeValue(value)).toBe(true);
    });

    it('should return false for an invalid list item', () => {
      expect(
        isAdditionalVerificationAttributeValue([
          {
            'Layout IDs': ['layout-1'],
          },
        ]),
      ).toBe(false);
    });
  });

  it('keeps approved exception literals compatible with weighing enums', () => {
    const tareException = {
      'Attribute Location': {
        Asset: { Category: DocumentCategory.MASS_ID },
        Event: DocumentEventName.WEIGHING,
      },
      'Attribute Name': DocumentEventAttributeName.TARE,
      'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason: 'validated',
    };

    expect(tareException['Attribute Name']).toBe(DocumentEventAttributeName.TARE);
  });
});
