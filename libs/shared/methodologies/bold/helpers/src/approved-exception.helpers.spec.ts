import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantAccreditationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { addDays, subDays } from 'date-fns';

import {
  getApprovedExceptions,
  isApprovedExceptionValid,
} from './approved-exception.helpers';

const { ACCREDITATION_RESULT } = BoldDocumentEventName;
const { APPROVED_EXCEPTIONS, EFFECTIVE_DATE } = BoldAttributeName;

const effectiveDates = {
  current: '2025-01-01T00:00:00.000Z',
  future: '2026-01-01T00:00:00.000Z',
  previous: '2024-01-01T00:00:00.000Z',
};

describe('Approved Exception Helpers', () => {
  describe('getApprovedExceptions', () => {
    describe('applicable accreditation period', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it.each([
        { expectedReason: 'Current period', periods: ['current'] },
        { expectedReason: 'Current period', periods: ['previous', 'current'] },
        { expectedReason: 'Current period', periods: ['current', 'previous'] },
        { expectedReason: 'Current period', periods: ['future', 'current'] },
        { expectedReason: undefined, periods: ['future'] },
      ] as const)(
        'should select exceptions for $periods at audit time',
        ({ expectedReason, periods }) => {
          const document = stubParticipantAccreditationDocument({
            externalEvents: periods.map((period) =>
              stubDocumentEventWithMetadataAttributes(
                { name: ACCREDITATION_RESULT },
                [
                  [BoldAttributeName.EFFECTIVE_DATE, effectiveDates[period]],
                  [
                    APPROVED_EXCEPTIONS,
                    [
                      {
                        'Attribute Location': {
                          Asset: { Category: BoldDocumentCategory.MASS_ID },
                          Event: BoldDocumentEventName.WEIGHING,
                        },
                        'Attribute Name': BoldAttributeName.TARE,
                        'Exception Type':
                          BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
                        Reason:
                          period === 'current'
                            ? 'Current period'
                            : 'Other period',
                      },
                    ],
                  ],
                ],
              ),
            ),
          });

          const exceptions = getApprovedExceptions(
            document,
            ACCREDITATION_RESULT,
          );

          expect(exceptions?.map((exception) => exception.Reason)).toEqual(
            expectedReason === undefined ? undefined : [expectedReason],
          );
        },
      );
    });

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
              Category: BoldDocumentCategory.MASS_ID,
            },
            Event: BoldDocumentEventName.WEIGHING,
          },
          'Attribute Name': BoldAttributeName.TARE,
          'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception reason',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, '2025-01-01T00:00:00.000Z'],
              [APPROVED_EXCEPTIONS, exceptions],
            ],
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
            [[EFFECTIVE_DATE, '2025-01-01T00:00:00.000Z']],
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
            [
              [EFFECTIVE_DATE, '2025-01-01T00:00:00.000Z'],
              [APPROVED_EXCEPTIONS, 'invalid'],
            ],
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
              Category: BoldDocumentCategory.MASS_ID,
            },
            Event: BoldDocumentEventName.WEIGHING,
          },
          'Attribute Name': BoldAttributeName.TARE,
          'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: BoldDocumentEventName.FACILITY_ADDRESS },
            [[APPROVED_EXCEPTIONS, exceptions]],
          ),
          stubDocumentEventWithMetadataAttributes(
            { name: BoldDocumentEventName.FACILITY_ADDRESS },
            [],
          ),
        ],
      });

      const result = getApprovedExceptions(
        document,
        BoldDocumentEventName.FACILITY_ADDRESS,
      );

      expect(result).toEqual(exceptions);
    });

    it('should return undefined when searching for a different event name', () => {
      const exceptions = [
        {
          'Attribute Location': {
            Asset: {
              Category: BoldDocumentCategory.MASS_ID,
            },
            Event: BoldDocumentEventName.WEIGHING,
          },
          'Attribute Name': BoldAttributeName.TARE,
          'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
          Reason: 'Test exception',
        },
      ];

      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, '2025-01-01T00:00:00.000Z'],
              [APPROVED_EXCEPTIONS, exceptions],
            ],
          ),
        ],
      });

      const result = getApprovedExceptions(
        document,
        BoldDocumentEventName.FACILITY_ADDRESS,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('isApprovedExceptionValid', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false when exception is undefined', () => {
      expect(isApprovedExceptionValid(undefined)).toBe(false);
    });

    it('should return true when exception has no Valid Until date', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return true when Valid Until date is in the future', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': addDays(new Date(), 5).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return false when Valid Until date is in the past', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': subDays(new Date(), 5).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });

    it('should return false when Valid Until date is invalid', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': 'invalid-date',
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });

    it('should return true when Valid Until date is today (edge case - not yet expired)', () => {
      const fixedDate = new Date('2024-01-15T12:00:00.000Z');

      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);

      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': fixedDate.toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);

      vi.useRealTimers();
    });

    it('should return true when Valid Until date is exactly one day in the future', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': addDays(new Date(), 1).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(true);
    });

    it('should return false when Valid Until date is exactly one day in the past', () => {
      const exception = {
        'Attribute Location': {
          Asset: {
            Category: BoldDocumentCategory.MASS_ID,
          },
          Event: BoldDocumentEventName.WEIGHING,
        },
        'Attribute Name': BoldAttributeName.TARE,
        'Exception Type': BoldApprovedExceptionType.MANDATORY_ATTRIBUTE,
        Reason: 'Test exception',
        'Valid Until': subDays(new Date(), 1).toISOString(),
      };

      expect(isApprovedExceptionValid(exception)).toBe(false);
    });
  });
});
