import {
  BoldApprovedExceptionType,
  BoldAttachmentLabel,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type AdditionalVerificationAttributeValue } from '@carrot-fndn/shared/types';

import {
  isAdditionalVerification,
  isAdditionalVerificationAttributeValue,
  isScaleTicketApprovedException,
} from './weighing.validators';

describe('weighing.validators', () => {
  describe('isAdditionalVerification', () => {
    it('should return true for a valid additional verification object', () => {
      expect(
        isAdditionalVerification({
          'Layout IDs': ['layout-1'],
          'Verification Type': 'MANUAL_REVIEW',
        }),
      ).toBe(true);
    });

    it('should return false when verification type is missing', () => {
      expect(
        isAdditionalVerification({
          'Layout IDs': ['layout-1'],
        }),
      ).toBe(false);
    });
  });

  describe('isAdditionalVerificationAttributeValue', () => {
    it('should return true for a valid list of additional verifications', () => {
      const value: AdditionalVerificationAttributeValue = [
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

  describe('isScaleTicketApprovedException', () => {
    const scaleTicketException = {
      'Attribute Location': {
        Asset: { Category: BoldDocumentCategory.MASS_ID },
        Event: BoldDocumentEventName.WEIGHING,
      },
      'Attribute Name': BoldAttachmentLabel.WEIGHING_TICKET,
      'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTACHMENT,
      Reason: 'No scale ticket for this waste generator',
      'Waste Generator Participant ID': 'waste-generator-participant-id',
    };

    it('should return true for an exception scoped to a waste generator', () => {
      expect(isScaleTicketApprovedException(scaleTicketException)).toBe(true);
    });

    it('should return false when the waste generator participant id is missing', () => {
      expect(
        isScaleTicketApprovedException({
          ...scaleTicketException,
          'Waste Generator Participant ID': undefined,
        }),
      ).toBe(false);
    });
  });

  it('keeps approved exception literals compatible with weighing enums', () => {
    const tareException = {
      'Attribute Location': {
        Asset: { Category: BoldDocumentCategory.MASS_ID },
        Event: BoldDocumentEventName.WEIGHING,
      },
      'Attribute Name': BoldAttributeName.TARE,
      'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
      Reason: 'validated',
    };

    expect(tareException['Attribute Name']).toBe(BoldAttributeName.TARE);
  });
});
