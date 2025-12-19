import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantAccreditationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAccreditationStatus,
  DocumentEventAttributeName,
  DocumentEventName,
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
  DocumentEventAttributeName;
const { ACCREDITATION_RESULT } = DocumentEventName;

describe('Accreditation Document Helpers', () => {
  describe('isAccreditationValid', () => {
    it.each([
      {
        date: subDays(new Date(), 2),
        dueDate: addDays(new Date(), 2),
        expected: true,
        scenario:
          'should return true if the effective date is in the past and the expiration date is in the future',
      },
      {
        date: addDays(new Date(), 2),
        dueDate: addDays(new Date(), 5),
        expected: false,
        scenario:
          'should return false if the effective date is in the future and the expiration date is in the future',
      },
      {
        date: subDays(new Date(), 2),
        dueDate: subDays(new Date(), 1),
        expected: false,
        scenario:
          'should return false if the effective date is in the past and the expiration date is in the past',
      },
      {
        date: new Date(),
        dueDate: addDays(new Date(), 5),
        expected: true,
        scenario:
          'should return true if the effective date is today and the expiration date is in the future',
      },
      {
        date: subDays(new Date(), 5),
        dueDate: new Date(),
        expected: true,
        scenario:
          'should return true if the effective date is in the past and the expiration date is today',
      },
      {
        date: new Date(),
        dueDate: new Date(),
        expected: true,
        scenario:
          'should return true if both the effective date and expiration date are today',
      },
      {
        date: addDays(new Date(), 1),
        dueDate: new Date(),
        expected: false,
        scenario:
          'should return false if the effective date is in the future and the expiration date is today',
      },
      {
        date: new Date(),
        dueDate: subDays(new Date(), 1),
        expected: false,
        scenario:
          'should return false if the effective date is today and the expiration date is in the past',
      },
    ])('$scenario', ({ date, dueDate, expected }) => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EXPIRATION_DATE, dueDate.toISOString()],
              [EFFECTIVE_DATE, date.toISOString()],
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(expected);
    });

    it('should return false if the document has a ACCREDITATION_RESULT event but the status is not APPROVED', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.REJECTED],
              [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
              [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
            ],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has no ACCREDITATION_RESULT event', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has a ACCREDITATION_RESULT event but no expiration date', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[EFFECTIVE_DATE, addDays(new Date(), 5).toISOString()]],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return false if the document has a ACCREDITATION_RESULT event but no effective date', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [[EXPIRATION_DATE, subDays(new Date(), 5).toISOString()]],
          ),
        ],
      });

      expect(isAccreditationValid(document)).toBe(false);
    });

    it('should return true if the document has a ACCREDITATION_RESULT event with valid effective date but no expiration date', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
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
    it('should return true if the document has no ACCREDITATION_RESULT event', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return true if the document has no externalEvents', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: undefined,
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return true if the document has a valid ACCREDITATION_RESULT event', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
              [EXPIRATION_DATE, addDays(new Date(), 5).toISOString()],
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(true);
    });

    it('should return false if the document has an invalid ACCREDITATION_RESULT event', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, addDays(new Date(), 5).toISOString()],
              [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(false);
    });

    it('should return false if the document has ACCREDITATION_RESULT event with invalid status', () => {
      const document = stubParticipantAccreditationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: ACCREDITATION_RESULT },
            [
              [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
              [EXPIRATION_DATE, addDays(new Date(), 5).toISOString()],
              [ACCREDITATION_STATUS, DocumentEventAccreditationStatus.REJECTED],
            ],
          ),
        ],
      });

      expect(isAccreditationValidWithOptionalDates(document)).toBe(false);
    });
  });
});
