import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  stubDocument,
  stubDocumentEvent,
  stubMassIdDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { addYears, getYear } from 'date-fns';

import {
  getDocumentEventById,
  getLastYearEmissionAndCompostingMetricsEvent,
  getParticipantActorType,
  getRulesMetadataEvent,
} from './document.getters';

const {
  DROP_OFF,
  EMISSION_AND_COMPOSTING_METRICS,
  HOMOLOGATION_CONTEXT,
  PICK_UP,
  RULES_METADATA,
} = DocumentEventName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;

const testEmissionAndCompostingMetricsEvent = (
  referenceYearValue: number | string,
) => {
  const targetEvent = stubDocumentEvent({
    metadata: {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.REFERENCE_YEAR,
          value: referenceYearValue,
        },
      ],
    },
    name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
  });

  const documentWithEmissionAndCompostingMetricsEvent = stubDocument({
    externalEvents: [...stubArray(() => stubDocumentEvent()), targetEvent],
  });

  const documentWithYear = stubDocument({
    externalCreatedAt: addYears(new Date(), 1).toISOString(),
  });

  return {
    result: getLastYearEmissionAndCompostingMetricsEvent({
      documentWithEmissionAndCompostingMetricsEvent,
      documentWithYear,
    }),
    targetEvent,
  };
};

describe('Document getters', () => {
  describe('getLastYearEmissionAndCompostingMetricsEvent', () => {
    it('should return correct emission and composting metrics event with string reference year', () => {
      const { result, targetEvent } = testEmissionAndCompostingMetricsEvent(
        getYear(new Date()).toString(),
      );

      expect(result).toEqual(targetEvent);
    });

    it('should return correct emission and composting metrics event with integer reference year', () => {
      const { result, targetEvent } = testEmissionAndCompostingMetricsEvent(
        getYear(new Date()),
      );

      expect(result).toEqual(targetEvent);
    });

    it('should return undefined when reference year is empty string', () => {
      const eventWithEmptyStringYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: DocumentEventAttributeName.REFERENCE_YEAR,
              value: '',
            },
          ],
        },
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument({
        externalEvents: [eventWithEmptyStringYear],
      });

      const documentWithYear = stubDocument({
        externalCreatedAt: new Date('2025-01-02').toISOString(),
      });

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentWithYear,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when reference year is zero', () => {
      const eventWithZeroYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: DocumentEventAttributeName.REFERENCE_YEAR,
              value: 0,
            },
          ],
        },
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument({
        externalEvents: [eventWithZeroYear],
      });

      const documentWithYear = stubDocument({
        externalCreatedAt: new Date('2025-01-02').toISOString(),
      });

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentWithYear,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when reference year is negative', () => {
      const eventWithNegativeYear = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: DocumentEventAttributeName.REFERENCE_YEAR,
              value: -1,
            },
          ],
        },
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      });

      const documentWithEmissionAndCompostingMetricsEvent = stubDocument({
        externalEvents: [eventWithNegativeYear],
      });

      const documentWithYear = stubDocument({
        externalCreatedAt: new Date('2025-01-02').toISOString(),
      });

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentWithYear,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined if the emission and composting metrics event is not found', () => {
      const documentWithEmissionAndCompostingMetricsEvent = stubDocument();
      const documentWithYear = stubDocument({
        externalCreatedAt: new Date().toISOString(),
      });

      const result = getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent,
        documentWithYear,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getRulesMetadataEvent', () => {
    it('should return the rules metadata event', () => {
      const rulesMetadataEvent = stubDocumentEvent({ name: RULES_METADATA });

      const document = stubDocument({
        externalEvents: [
          ...stubArray(() => stubDocumentEvent()),
          rulesMetadataEvent,
        ],
      });

      const result = getRulesMetadataEvent(document);

      expect(result).toEqual(rulesMetadataEvent);
    });

    it('should return undefined if the rules metadata event was not found', () => {
      const document = stubDocument({
        externalEvents: stubArray(() => stubDocumentEvent()),
      });

      const result = getRulesMetadataEvent(document);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the document is undefined', () => {
      const result = getRulesMetadataEvent(undefined);

      expect(result).toBe(undefined);
    });
  });

  describe('getParticipantActorType', () => {
    it(`should return "${WASTE_GENERATOR}" when the event is a pick up at the source`, () => {
      const sourcePickUpEvent = stubDocumentEvent({ name: PICK_UP });
      const document = stubMassIdDocument({
        externalEvents: [
          sourcePickUpEvent,
          stubDocumentEvent({ name: DROP_OFF }),
          stubDocumentEvent({ name: PICK_UP }),
          stubDocumentEvent({ name: DROP_OFF }),
        ],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: sourcePickUpEvent,
      });

      expect(participantActorType).toEqual(WASTE_GENERATOR);
    });

    it(`should return "${PROCESSOR}" when the event is a drop off at processor`, () => {
      const processorDropOffEvent = stubDocumentEvent({ name: DROP_OFF });
      const document = stubMassIdDocument({
        externalEvents: [
          stubDocumentEvent({ name: PICK_UP }),
          processorDropOffEvent,
          stubDocumentEvent({ name: PICK_UP }),
          stubDocumentEvent({ name: DROP_OFF }),
        ],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: processorDropOffEvent,
      });

      expect(participantActorType).toEqual(PROCESSOR);
    });

    it(`should return "${PROCESSOR}" when the event is a pick up at processor`, () => {
      const processorPickUpEvent = stubDocumentEvent({ name: PICK_UP });
      const document = stubMassIdDocument({
        externalEvents: [
          stubDocumentEvent({ name: PICK_UP }),
          stubDocumentEvent({ name: DROP_OFF }),
          processorPickUpEvent,
          stubDocumentEvent({ name: DROP_OFF }),
        ],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: processorPickUpEvent,
      });

      expect(participantActorType).toEqual(PROCESSOR);
    });

    it(`should return "${RECYCLER}" when the event is a drop off at recycler`, () => {
      const recyclerDropOffEvent = stubDocumentEvent({ name: DROP_OFF });
      const document = stubMassIdDocument({
        externalEvents: [
          stubDocumentEvent({ name: PICK_UP }),
          stubDocumentEvent({ name: DROP_OFF }),
          stubDocumentEvent({ name: PICK_UP }),
          recyclerDropOffEvent,
        ],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: recyclerDropOffEvent,
      });

      expect(participantActorType).toEqual(RECYCLER);
    });

    it('should return undefined when the document has no pick up events', () => {
      const dropOffEvent = stubDocumentEvent({ name: DROP_OFF });
      const document = stubMassIdDocument({
        externalEvents: [dropOffEvent],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: dropOffEvent,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has no drop off events', () => {
      const pickUpEvent = stubDocumentEvent({ name: PICK_UP });
      const document = stubMassIdDocument({
        externalEvents: [pickUpEvent],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: pickUpEvent,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has no external events', () => {
      const event = stubDocumentEvent({ name: PICK_UP });
      const document = stubMassIdDocument({
        externalEvents: undefined,
      });

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has empty external events array', () => {
      const event = stubDocumentEvent({ name: PICK_UP });
      const document = stubMassIdDocument({
        externalEvents: [],
      });

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the document has non-array external events', () => {
      const event = stubDocumentEvent({ name: PICK_UP });
      const document = {
        ...stubMassIdDocument(),
        externalEvents: 'not an array',
      } as unknown as Document;

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the event is neither a pick-up nor a drop-off event', () => {
      const otherEvent = stubDocumentEvent({ name: HOMOLOGATION_CONTEXT });
      const document = stubMassIdDocument({
        externalEvents: [
          stubDocumentEvent({ name: PICK_UP }),
          stubDocumentEvent({ name: DROP_OFF }),
          otherEvent,
        ],
      });

      const participantActorType = getParticipantActorType({
        document,
        event: otherEvent,
      });

      expect(participantActorType).toBeUndefined();
    });
  });

  describe('getDocumentEventById', () => {
    it('should return the document event by id', () => {
      const documentEvent = stubDocumentEvent();
      const document = stubMassIdDocument({
        externalEvents: [documentEvent],
      });

      const result = getDocumentEventById(document, documentEvent.id);

      expect(result).toEqual(documentEvent);
    });

    it('should return undefined when the document event is not found', () => {
      const document = stubMassIdDocument();

      const result = getDocumentEventById(document, 'non-existent-id');

      expect(result).toBeUndefined();
    });
  });
});
