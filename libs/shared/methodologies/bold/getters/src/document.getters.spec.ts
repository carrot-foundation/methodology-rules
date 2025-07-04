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
import { getYear } from 'date-fns';

import {
  getDocumentEventById,
  getLastEmissionAndCompostingMetricsEvent,
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

describe('Document getters', () => {
  describe('getLastEmissionAndCompostingMetricsEvent', () => {
    it('should return last emission and composting metrics event', () => {
      const firstEmissionAndCompostingMetricsEvent = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: DocumentEventAttributeName.REFERENCE_YEAR,
              value: '2023',
            },
          ],
        },
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      });

      const secondEmissionAndCompostingMetricsEvent = stubDocumentEvent({
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: DocumentEventAttributeName.REFERENCE_YEAR,
              value: '2024',
            },
          ],
        },
        name: `${EMISSION_AND_COMPOSTING_METRICS} (${getYear(new Date())})`,
      });

      const document = stubDocument({
        externalEvents: [
          ...stubArray(() => stubDocumentEvent()),
          firstEmissionAndCompostingMetricsEvent,
          secondEmissionAndCompostingMetricsEvent,
        ],
      });

      const result = getLastEmissionAndCompostingMetricsEvent(document);

      expect(result).toEqual(secondEmissionAndCompostingMetricsEvent);
    });

    it('should return undefined if the emission and composting metrics event is not found', () => {
      const document = stubDocument();

      const result = getLastEmissionAndCompostingMetricsEvent(document);

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
