import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantAccreditationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyApprovedExceptionType } from '@carrot-fndn/shared/types';
import { addDays, subDays } from 'date-fns';

import {
  getApprovedExceptions,
  isApprovedExceptionValid,
} from './approved-exception.helpers';

const { ACCREDITATION_RESULT } = DocumentEventName;
const { APPROVED_EXCEPTIONS } = DocumentEventAttributeName;

describe('Approved Exception Helpers', () => {
  describe('getApprovedExceptions', () => {
    it('should return approved exceptions when the event exists and has valid exceptions', () => {
      const exceptions: Array<{
        'Attribute Location': {
          Asset: { Category: string };
          Event: string;
        };
        'Attribute Name': string;
        'Exception Type': string;
        Reason: string;
      }> = [
        {
          'Attribute Location': {
            Asset: {
              Category: DocumentCategory.MASS_ID,
            },
            Event: DocumentEventName.WEIGHING,
          },
          'Attribute Name': DocumentEventAttributeName.TARE,
          'Exception Type':
            MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception reason',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[APPROVED_EXCEPTIONS, exceptions]],
          ),
        ],
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toEqual(exceptions);
    });

    it('should return undefined when the event does not exist', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [],
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toBeUndefined();
    });

    it('should return undefined when the event exists but has no APPROVED_EXCEPTIONS attribute', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [],
          ),
        ],
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toBeUndefined();
    });

    it('should return undefined when the event exists but APPROVED_EXCEPTIONS is not a valid array', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[APPROVED_EXCEPTIONS, 'invalid']],
          ),
        ],
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toBeUndefined();
    });

    it('should return undefined when the document has no externalEvents', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: undefined,
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toBeUndefined();
    });

    it('should return exceptions for the specified event name', () => {
      const exceptions = [
        {
          'Attribute Location': {
            Asset: {
              Category: DocumentCategory.MASS_ID,
            },
            Event: DocumentEventName.WEIGHING,
          },
          'Attribute Name': DocumentEventAttributeName.TARE,
          'Exception Type':
            MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[APPROVED_EXCEPTIONS, exceptions]],
          ),
          stubDocumentEventWithMetadataAttributes(
            { name: DocumentEventName.FACILITY_ADDRESS },
            [],
          ),
        ],
      });

      const result = getApprovedExceptions(document, ACCREDITATION_RESULT);

      expect(result).toEqual(exceptions);
    });

    it('should return undefined when searching for a different event name', () => {
      const exceptions = [
        {
          'Attribute Location': {
            Asset: {
              Category: DocumentCategory.MASS_ID,
            },
            Event: DocumentEventName.WEIGHING,
          },
          'Attribute Name': DocumentEventAttributeName.TARE,
          'Exception Type':
            MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[APPROVED_EXCEPTIONS, exceptions]],
          ),
        ],
      });

      const result = getApprovedExceptions(
        document,
        DocumentEventName.FACILITY_ADDRESS,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('isApprovedExceptionValid', () => {
    it('should return false when exception is undefined', () => {
      expect(isApprovedExceptionValid(undefined)).toBe(false);
    });

    it('should return true when exception has no Valid Until date', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return true when Valid Until date is in the future', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': addDays(new Date(), 5).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return false when Valid Until date is in the past', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': subDays(new Date(), 5).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });

    it('should return false when Valid Until date is invalid', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': 'invalid-date',
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });

    it('should return true when Valid Until date is today (edge case - not yet expired)', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': new Date().toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return true when Valid Until date is exactly one day in the future', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': addDays(new Date(), 1).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return false when Valid Until date is exactly one day in the past', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: DocumentCategory.MASS_ID,
          },
          Event: DocumentEventName.WEIGHING,
        },
        'Attribute Name': DocumentEventAttributeName.TARE,
        'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': subDays(new Date(), 1).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });
  });
});
