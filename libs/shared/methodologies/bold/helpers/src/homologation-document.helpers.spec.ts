import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubParticipantHomologationDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker/.';
import { addDays, formatDate, subDays } from 'date-fns';

import {
  getParticipantHomologationDocumentByParticipantId,
  isHomologationInForce,
} from './homologation-document.helpers';

const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;
const { CLOSE } = DocumentEventName;

describe('Homologation Document Helpers', () => {
  describe('isHomologationInForce', () => {
    it.each([
      {
        date: subDays(new Date(), 2),
        dueDate: addDays(new Date(), 2),
        expected: true,
        scenario:
          'should return true if the homologation date is in the past and the due date is in the future',
      },
      {
        date: addDays(new Date(), 2),
        dueDate: addDays(new Date(), 5),
        expected: false,
        scenario:
          'should return false if the homologation date is in the future and the due date is in the future',
      },
      {
        date: subDays(new Date(), 2),
        dueDate: subDays(new Date(), 1),
        expected: false,
        scenario:
          'should return false if the homologation date is in the past and the due date is in the past',
      },
      {
        date: new Date(),
        dueDate: addDays(new Date(), 5),
        expected: true,
        scenario:
          'should return true if the homologation date is today and the due date is in the future',
      },
      {
        date: subDays(new Date(), 5),
        dueDate: new Date(),
        expected: true,
        scenario:
          'should return true if the homologation date is in the past and the due date is today',
      },
      {
        date: new Date(),
        dueDate: new Date(),
        expected: true,
        scenario:
          'should return true if both the homologation date and due date are today',
      },
      {
        date: addDays(new Date(), 1),
        dueDate: new Date(),
        expected: false,
        scenario:
          'should return false if the homologation date is in the future and the due date is today',
      },
      {
        date: new Date(),
        dueDate: subDays(new Date(), 1),
        expected: false,
        scenario:
          'should return false if the homologation date is today and the due date is in the past',
      },
    ])('$scenario', ({ date, dueDate, expected }) => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
            [HOMOLOGATION_DUE_DATE, formatDate(dueDate, 'yyyy-MM-dd')],
            [HOMOLOGATION_DATE, formatDate(date, 'yyyy-MM-dd')],
          ]),
        ],
      });

      expect(isHomologationInForce(document)).toBe(expected);
    });

    it('should return false if the document has no CLOSE event', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [],
      });

      expect(isHomologationInForce(document)).toBe(false);
    });

    it('should return false if the document has a CLOSE event but no homologation date', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
            [
              HOMOLOGATION_DUE_DATE,
              formatDate(addDays(new Date(), 5), 'yyyy-MM-dd'),
            ],
          ]),
        ],
      });

      expect(isHomologationInForce(document)).toBe(false);
    });

    it('should return false if the document has a CLOSE event but no homologation due date', () => {
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
            [
              HOMOLOGATION_DATE,
              formatDate(subDays(new Date(), 5), 'yyyy-MM-dd'),
            ],
          ]),
        ],
      });

      expect(isHomologationInForce(document)).toBe(false);
    });
  });

  describe('getParticipantHomologationDocumentByParticipantId', () => {
    it('should return the homologation document for the given participant id', () => {
      const participantId = faker.string.uuid();
      const openEvent = stubDocumentEvent({
        name: DocumentEventName.OPEN,
      });
      const document = stubParticipantHomologationDocument({
        externalEvents: [
          {
            ...openEvent,
            participant: {
              ...openEvent.participant,
              id: participantId,
            },
          },
        ],
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
