import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassDocument,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  getAuditorActorEvent,
  getDocumentEventById,
  getFirstDocumentEventAttributeValue,
  getOpenEvent,
  getParticipantActorType,
  getRulesMetadataEvent,
} from './document.getters';

const { ACTOR, DROP_OFF, OPEN, PICK_UP, RULES_METADATA } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;
const { SORTING_FACTOR } = NewDocumentEventAttributeName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;

describe('Document getters', () => {
  describe('getAuditorActorEvent', () => {
    it('should return the auditor actor event', () => {
      const auditorActorEvent = stubDocumentEventWithMetadataAttributes(
        { name: ACTOR },
        [[ACTOR_TYPE, AUDITOR]],
      );

      const document = stubDocument({
        externalEvents: [
          auditorActorEvent,
          ...stubArray(() => stubDocumentEvent()),
        ],
      });

      const result = getAuditorActorEvent(document);

      expect(result).toEqual(auditorActorEvent);
    });

    it('should return undefined if the auditor actor event was not found', () => {
      const actorEvent = stubDocumentEventWithMetadataAttributes({
        name: ACTOR,
      });

      const document = stubDocument({
        externalEvents: [actorEvent, ...stubArray(() => stubDocumentEvent())],
      });

      const result = getAuditorActorEvent(document);

      expect(result).toBe(undefined);
    });
  });

  describe('getOpenEvent', () => {
    it('should return the open event', () => {
      const openEvent = stubDocumentEvent({ name: OPEN });

      const document = stubDocument({
        externalEvents: [...stubArray(() => stubDocumentEvent()), openEvent],
      });

      const result = getOpenEvent(document);

      expect(result).toEqual(openEvent);
    });

    it('should return undefined if the open event was not found', () => {
      const document = stubDocument({
        externalEvents: stubArray(() => stubDocumentEvent()),
      });

      const result = getOpenEvent(document);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the document is undefined', () => {
      const result = getOpenEvent(undefined);

      expect(result).toBe(undefined);
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
      const document = stubMassDocument({
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
        ...stubMassDocument(),
        externalEvents: 'not an array',
      } as unknown as Document;

      const participantActorType = getParticipantActorType({
        document,
        event,
      });

      expect(participantActorType).toBeUndefined();
    });

    it('should return undefined when the event is neither a pick-up nor a drop-off event', () => {
      const otherEvent = stubDocumentEvent({ name: OPEN });
      const document = stubMassDocument({
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

  describe('getFirstDocumentEventAttributeValue', () => {
    it(`should return the first attribute value that matches the attribute name`, () => {
      const attributeValue = faker.number.float({ max: 1, min: 0 });
      const eventWithTheAttribute = stubDocumentEventWithMetadataAttributes(
        {},
        [[SORTING_FACTOR, attributeValue]],
      );
      const document = stubMassDocument({
        externalEvents: [
          eventWithTheAttribute,
          ...stubArray(() => stubDocumentEvent()),
        ],
      });

      const result = getFirstDocumentEventAttributeValue(
        document,
        SORTING_FACTOR,
      );

      expect(result).toEqual(attributeValue);
    });

    it(`should return undefined when the attribute name is not found`, () => {
      const document = stubMassDocument();

      const result = getFirstDocumentEventAttributeValue(
        document,
        SORTING_FACTOR,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when the document does not have external events', () => {
      const document = stubMassDocument({
        externalEvents: undefined,
      });

      const result = getFirstDocumentEventAttributeValue(
        document,
        SORTING_FACTOR,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getDocumentEventById', () => {
    it('should return the document event by id', () => {
      const documentEvent = stubDocumentEvent();
      const document = stubMassDocument({
        externalEvents: [documentEvent],
      });

      const result = getDocumentEventById(document, documentEvent.id);

      expect(result).toEqual(documentEvent);
    });

    it('should return undefined when the document event is not found', () => {
      const document = stubMassDocument();

      const result = getDocumentEventById(document, 'non-existent-id');

      expect(result).toBeUndefined();
    });
  });
});
