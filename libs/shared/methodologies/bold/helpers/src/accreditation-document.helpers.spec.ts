import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantAccreditationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { addDays, subDays } from 'date-fns';

import {
  getParticipantAccreditationDocumentByParticipantId,
  isAccreditationValid,
  isAccreditationValidWithOptionalDates,
} from './accreditation-document.helpers';

const { ACCREDITATION_STATUS, EFFECTIVE_DATE, EXPIRATION_DATE } =
  BoldAttributeName;
const { ACCREDITATION_RESULT } = BoldDocumentEventName;
const evaluationDate = new Date(2025, 5, 15, 12);

const stubAccreditationDocumentWithExternalEvents = ({
  externalEvents,
}: {
  externalEvents:
    | ReturnType<typeof stubParticipantAccreditationDocument>['externalEvents']
    | undefined;
}) => {
  const document = stubParticipantAccreditationDocument({
    externalEvents: [],
  });

  document.externalEvents = externalEvents;

  return document;
};

describe('Accreditation Document Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(evaluationDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isAccreditationValid', () => {
    const firstPeriod = {
      effectiveDate: '2024-01-01T00:00:00.000Z',
      expirationDate: '2024-12-31T00:00:00.000Z',
      status: BoldAccreditationStatus.APPROVED,
    };
    const renewal = {
      effectiveDate: '2025-01-01T00:00:00.000Z',
      expirationDate: '2025-12-31T00:00:00.000Z',
      status: BoldAccreditationStatus.APPROVED,
    };
    const overlappingPeriod = {
      ...firstPeriod,
      expirationDate: '2026-12-31T00:00:00.000Z',
    };

    it.each([
      {
        at: '2024-06-15T12:00:00.000Z',
        expected: true,
        periods: [firstPeriod],
        scenario: 'a single period covers the audit run date',
      },
      {
        at: '2024-06-15T12:00:00.000Z',
        expected: true,
        periods: [renewal, firstPeriod],
        scenario: 'a future renewal precedes the current period in the array',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: true,
        periods: [firstPeriod, renewal],
        scenario: 'the renewed period follows an expired period in the array',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: true,
        periods: [renewal, firstPeriod],
        scenario: 'the renewed period precedes an expired period in the array',
      },
      {
        at: '2025-02-01T12:00:00.000Z',
        expected: false,
        periods: [
          firstPeriod,
          { ...renewal, effectiveDate: '2025-03-01T00:00:00.000Z' },
        ],
        scenario: 'the audit runs in the gap before a future renewal',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: false,
        periods: [
          overlappingPeriod,
          { ...renewal, status: BoldAccreditationStatus.REJECTED },
        ],
        scenario: 'a newer rejected period overlaps an older approval',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: false,
        periods: [
          overlappingPeriod,
          { ...renewal, expirationDate: '2025-05-01T00:00:00.000Z' },
        ],
        scenario: 'a newer expired period overlaps an older approval',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: false,
        periods: [
          overlappingPeriod,
          { ...renewal, expirationDate: 'invalid-date' },
        ],
        scenario: 'the newer period has a malformed expiration date',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: false,
        periods: [overlappingPeriod, { ...renewal, status: 'invalid-status' }],
        scenario: 'the newer period has an invalid status',
      },
      {
        at: '2025-06-15T12:00:00.000Z',
        expected: true,
        periods: [
          { ...renewal, effectiveDate: 'invalid-date' },
          overlappingPeriod,
        ],
        scenario: 'a malformed effective date is excluded from selection',
      },
      {
        at: '2023-06-15T12:00:00.000Z',
        expected: false,
        periods: [firstPeriod, renewal],
        scenario: 'the audit runs before the first period',
      },
      {
        at: '2025-01-01T00:00:00.000Z',
        expected: true,
        periods: [firstPeriod, renewal],
        scenario: 'the audit runs at the renewal effective timestamp',
      },
      {
        at: '2024-12-31T23:59:59.999Z',
        expected: false,
        periods: [renewal],
        scenario: 'the audit runs just before the effective timestamp',
      },
    ])(
      'should return $expected when $scenario',
      ({ at, expected, periods }) => {
        const document = stubAccreditationDocumentWithExternalEvents({
          externalEvents: periods.map((period) =>
            stubDocumentEventWithMetadataAttributes(
              { name: ACCREDITATION_RESULT },
              [
                [EFFECTIVE_DATE, period.effectiveDate],
                [EXPIRATION_DATE, period.expirationDate],
                [ACCREDITATION_STATUS, period.status],
              ],
            ),
          ),
        });

        vi.setSystemTime(new Date(at));

        expect(isAccreditationValid(document)).toBe(expected);
      },
    );

    it.each([
      { at: new Date(2025, 5, 15, 23, 59, 59), expected: true },
      { at: new Date(2025, 5, 16), expected: false },
    ])(
      'should return $expected at the expiration day boundary $at',
      ({ at, expected }) => {
        const document = stubAccreditationDocumentWithExternalEvents({
          externalEvents: [
            stubDocumentEventWithMetadataAttributes(
              { name: ACCREDITATION_RESULT },
              [
                [EFFECTIVE_DATE, new Date(2025, 5, 1).toISOString()],
                [EXPIRATION_DATE, new Date(2025, 5, 15).toISOString()],
                [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
              ],
            ),
          ],
        });

        vi.setSystemTime(at);

        expect(isAccreditationValid(document)).toBe(expected);
      },
    );

    it.each([
      {
        date: subDays(evaluationDate, 2),
        dueDate: addDays(evaluationDate, 2),
        expected: true,
        scenario:
          'should return true if the effective date is in the past and the expiration date is in the future',
      },
      {
        date: addDays(evaluationDate, 2),
        dueDate: addDays(evaluationDate, 5),
        expected: false,
        scenario:
          'should return false if the effective date is in the future and the expiration date is in the future',
      },
      {
        date: subDays(evaluationDate, 2),
        dueDate: subDays(evaluationDate, 1),
        expected: false,
        scenario:
          'should return false if the effective date is in the past and the expiration date is in the past',
      },
      {
        date: evaluationDate,
        dueDate: addDays(evaluationDate, 5),
        expected: true,
        scenario:
          'should return true if the effective date is today and the expiration date is in the future',
      },
      {
        date: subDays(evaluationDate, 5),
        dueDate: evaluationDate,
        expected: true,
        scenario:
          'should return true if the effective date is in the past and the expiration date is today',
      },
      {
        date: evaluationDate,
        dueDate: evaluationDate,
        expected: true,
        scenario:
          'should return true if both the effective date and expiration date are today',
      },
      {
        date: addDays(evaluationDate, 1),
        dueDate: evaluationDate,
        expected: false,
        scenario:
          'should return false if the effective date is in the future and the expiration date is today',
      },
      {
        date: evaluationDate,
        dueDate: subDays(evaluationDate, 1),
        expected: false,
        scenario:
          'should return false if the effective date is today and the expiration date is in the past',
      },
    ])('$scenario', ({ date, dueDate, expected }) => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EXPIRATION_DATE, dueDate.toISOString()],
              [EFFECTIVE_DATE, date.toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(expected);
    });

    it('should return false if the document has a ACCREDITATION_RESULT event but the status is not APPROVED', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [ACCREDITATION_STATUS, BoldAccreditationStatus.REJECTED],
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, addDays(evaluationDate, 10).toISOString()],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has no ACCREDITATION_RESULT event', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has no externalEvents', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: undefined,
      });

      document.externalEvents = undefined;

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has ACCREDITATION_RESULT event with invalid expiration date format', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, 'not-a-valid-datetime'],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has ACCREDITATION_RESULT event with status not in enum', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, addDays(evaluationDate, 5).toISOString()],
              [ACCREDITATION_STATUS, 'Unknown'],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the result has no status and a future effective date', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[EFFECTIVE_DATE, addDays(evaluationDate, 5).toISOString()]],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has a ACCREDITATION_RESULT event but no effective date', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[EXPIRATION_DATE, subDays(evaluationDate, 5).toISOString()]],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has ACCREDITATION_RESULT event with invalid effective date format', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, 'not-a-valid-datetime'],
              [EXPIRATION_DATE, addDays(evaluationDate, 5).toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return true when dates use timezone offsets instead of UTC', () => {
      const pastDate = subDays(evaluationDate, 5);
      const futureDate = addDays(evaluationDate, 5);
      const offset = '-03:00';
      const toOffsetISO = (date: Date) =>
        date.toISOString().replace('Z', offset);

      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, toOffsetISO(pastDate)],
              [EXPIRATION_DATE, toOffsetISO(futureDate)],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(true);
    });

    it('should return true if the document has a ACCREDITATION_RESULT event with valid effective date but no expiration date', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(true);
    });
  });

  describe('getParticipantAccreditationDocumentByParticipantId', () => {
    it('should return the accreditation document for the given participant id', () => {
      const participantId = faker.string.uuid();
      const document = stubParticipantAccreditationDocument({
        primaryParticipant: {
          id: participantId,
        },
      });

      const result = getParticipantAccreditationDocumentByParticipantId({
        accreditationDocuments: [
          ...stubArray(stubParticipantAccreditationDocument),
          document,
        ],
        participantId,
      });

      expect(result).toBe(document);
    });

    it('should return undefined if the participant id is not found', () => {
      const result = getParticipantAccreditationDocumentByParticipantId({
        accreditationDocuments: stubArray(stubParticipantAccreditationDocument),
        participantId: faker.string.uuid(),
      });

      expect(result).toBeUndefined();
    });
  });

  describe('isAccreditationValidWithOptionalDates', () => {
    it.each([
      { at: '2024-06-15T12:00:00.000Z', expected: true },
      { at: '2025-06-15T12:00:00.000Z', expected: false },
      { at: '2023-06-15T12:00:00.000Z', expected: false },
    ])(
      'should return $expected for the optional accreditation at $at',
      ({ at, expected }) => {
        const document = stubAccreditationDocumentWithExternalEvents({
          externalEvents: [
            stubDocumentEventWithMetadataAttributes(
              { name: ACCREDITATION_RESULT },
              [
                [EFFECTIVE_DATE, '2025-01-01T00:00:00.000Z'],
                [EXPIRATION_DATE, '2025-12-31T00:00:00.000Z'],
                [ACCREDITATION_STATUS, BoldAccreditationStatus.REJECTED],
              ],
            ),
            stubDocumentEventWithMetadataAttributes(
              { name: ACCREDITATION_RESULT },
              [
                [EFFECTIVE_DATE, '2024-01-01T00:00:00.000Z'],
                [EXPIRATION_DATE, '2024-12-31T00:00:00.000Z'],
                [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
              ],
            ),
          ],
        });

        vi.setSystemTime(new Date(at));

        expect(isAccreditationValidWithOptionalDates(document)).toBe(expected);
      },
    );

    it('should return true if the document has no ACCREDITATION_RESULT event', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return true if the document has no externalEvents', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: undefined,
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return true if the document has a valid ACCREDITATION_RESULT event', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, addDays(evaluationDate, 5).toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return false if the document has an invalid ACCREDITATION_RESULT event', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, addDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, addDays(evaluationDate, 10).toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(false);
    });

    it('should return false if the document has ACCREDITATION_RESULT event with invalid status', () => {
      const document = stubAccreditationDocumentWithExternalEvents({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(evaluationDate, 5).toISOString()],
              [EXPIRATION_DATE, addDays(evaluationDate, 5).toISOString()],
              [ACCREDITATION_STATUS, BoldAccreditationStatus.REJECTED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(false);
    });
  });
});
