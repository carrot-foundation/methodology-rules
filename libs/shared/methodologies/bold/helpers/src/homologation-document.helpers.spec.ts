import {
  stubDocumentEventWithMetadataAttributes,
  stubParticipantHomologationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventHomologationStatus,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { addDays, subDays } from 'date-fns';

import {
  getParticipantHomologationDocumentByParticipantId,
  isHomologationValid,
} from './homologation-document.helpers';

const { EFFECTIVE_DATE, EXPIRATION_DATE, HOMOLOGATION_STATUS } =
  DocumentEventAttributeName;
const { HOMOLOGATION_RESULT } = DocumentEventName;

describe('Homologation Document Helpers', () => {
  describe('isHomologationValid', () => {
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
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: HOMOLOGATION_RESULT },
            [
              [EXPIRATION_DATE, dueDate.toISOString()],
              [EFFECTIVE_DATE, date.toISOString()],
              [HOMOLOGATION_STATUS, DocumentEventHomologationStatus.APPROVED],
            ],
          ),
        ],
      });

      expect(isHomologationValid(document)).toBe(expected);
    });

    it('should return false if the document has a HOMOLOGATION_RESULT event but the status is not APPROVED', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: HOMOLOGATION_RESULT },
            [
              [HOMOLOGATION_STATUS, DocumentEventHomologationStatus.REJECTED],
              [EFFECTIVE_DATE, subDays(new Date(), 5).toISOString()],
              [EXPIRATION_DATE, addDays(new Date(), 10).toISOString()],
            ],
          ),
        ],
      });

      expect(isHomologationValid(document)).toBe(false);
    });

    it('should return false if the document has no HOMOLOGATION_RESULT event', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [],
      });

      expect(isHomologationValid(document)).toBe(false);
    });

    it('should return false if the document has a HOMOLOGATION_RESULT event but no expiration date', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: HOMOLOGATION_RESULT },
            [[EFFECTIVE_DATE, addDays(new Date(), 5).toISOString()]],
          ),
        ],
      });

      expect(isHomologationValid(document)).toBe(false);
    });

    it('should return false if the document has a HOMOLOGATION_RESULT event but no effective date', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: HOMOLOGATION_RESULT },
            [[EXPIRATION_DATE, subDays(new Date(), 5).toISOString()]],
          ),
        ],
      });

      expect(isHomologationValid(document)).toBe(false);
    });
  });

  describe('getParticipantHomologationDocumentByParticipantId', () => {
    it('should return the homologation document for the given participant id', () => {
      const participantId = faker.string.uuid();
      const document = stubParticipantHomologationDocument({
        primaryParticipant: {
          id: participantId,
        },
      });

      const result = getParticipantHomologationDocumentByParticipantId({
        homologationDocuments: [
          ...stubArray(stubParticipantHomologationDocument),
          document,
        ],
        participantId,
      });

      expect(result).toBe(document);
    });

    it('should return undefined if the participant id is not found', () => {
      const result = getParticipantHomologationDocumentByParticipantId({
        homologationDocuments: stubArray(stubParticipantHomologationDocument),
        participantId: faker.string.uuid(),
      });

      expect(result).toBeUndefined();
    });
  });
});
