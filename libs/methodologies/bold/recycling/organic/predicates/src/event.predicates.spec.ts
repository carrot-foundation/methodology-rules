import {
  stubDocumentEvent,
  stubDocumentEventAttribute,
  stubDocumentEventWithMetadata,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { stubArray, stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  DataSetName,
  MethodologyParticipantType,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import {
  eventHasActorParticipant,
  eventHasAuditorActor,
  eventHasCarrotParticipant,
  eventHasMetadataAttribute,
  eventHasName,
  eventHasNonEmptyStringAttribute,
  eventHasRecyclerActor,
  eventHasSourceActor,
  eventsHasSameMetadataAttributeValue,
  hasWeightFormat,
  isActorEvent,
  isActorEventWithSourceActorType,
  isOpenEvent,
} from './event.predicates';

describe('Event Predicates', () => {
  describe('eventHasActorParticipant', () => {
    it('should return true if the event is an actor participant type', () => {
      const event = stubDocumentEvent();

      event.participant.type = MethodologyParticipantType.ACTOR;

      expect(eventHasActorParticipant(event)).toBe(true);
    });

    it('should return false if the event is not an actor participant type', () => {
      const event = stubDocumentEvent();

      event.participant.type = faker.string.sample();

      expect(eventHasActorParticipant(event)).toBe(false);
    });
  });

  describe('eventHasName', () => {
    it('should return true if the event has the event name', () => {
      const name = stubEnumValue(DocumentEventName);
      const event = stubDocumentEvent({ name });

      const result = eventHasName(event, name);

      expect(result).toBe(true);
    });

    it('should return false if the event does not have the event name', () => {
      const event = stubDocumentEvent({
        name: DocumentEventName.OPEN,
      });

      const result = eventHasName(event, DocumentEventName.ACTOR);

      expect(result).toBe(false);
    });
  });

  describe('isActorEvent', () => {
    it('should return true if the event is an actor event', () => {
      const event = stubDocumentEvent({
        name: DocumentEventName.ACTOR,
      });

      const result = isActorEvent(event);

      expect(result).toBe(true);
    });

    it('should return false if the event is not an actor event', () => {
      const event = stubDocumentEvent({
        name: DocumentEventName.OPEN,
      });

      const result = isActorEvent(event);

      expect(result).toBe(false);
    });
  });

  describe('isOpenEvent', () => {
    it('should return true if the event is an OPEN event', () => {
      const event = stubDocumentEvent({
        name: DocumentEventName.OPEN,
      });

      const result = isOpenEvent(event);

      expect(result).toBe(true);
    });

    it('should return false if the event is not an actor event', () => {
      const event = stubDocumentEvent({
        name: DocumentEventName.ACTOR,
      });

      const result = isOpenEvent(event);

      expect(result).toBe(false);
    });
  });

  describe('eventHasSourceActor', () => {
    it('should return true if the event actor type is source', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.SOURCE,
        }),
      ]);

      const result = eventHasSourceActor(event);

      expect(result).toBe(true);
    });

    it('should return false if the actor type is not source', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.RECYCLER,
        }),
      ]);

      const result = eventHasSourceActor(event);

      expect(result).toBe(false);
    });

    it('should return false if the event does not have and actor type', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = eventHasSourceActor(event);

      expect(result).toBe(false);
    });
  });

  describe('eventHasRecyclerActor', () => {
    it('should return true if the event actor type is recycler', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.RECYCLER,
        }),
      ]);

      const result = eventHasRecyclerActor(event);

      expect(result).toBe(true);
    });

    it('should return false if the actor type is not recycler', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.SOURCE,
        }),
      ]);

      const result = eventHasRecyclerActor(event);

      expect(result).toBe(false);
    });

    it('should return false if the event does not have and actor type', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = eventHasRecyclerActor(event);

      expect(result).toBe(false);
    });
  });

  describe('eventHasAuditorActor', () => {
    it('should return true if the event actor type is auditor', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.AUDITOR,
        }),
      ]);

      const result = eventHasAuditorActor(event);

      expect(result).toBe(true);
    });

    it('should return false if the actor type is not auditor', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.ACTOR_TYPE,
          value: DocumentEventActorType.SOURCE,
        }),
      ]);

      const result = eventHasAuditorActor(event);

      expect(result).toBe(false);
    });

    it('should return false if the event does not have and actor type', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = eventHasAuditorActor(event);

      expect(result).toBe(false);
    });
  });

  describe('isActorEventWithSourceActorType', () => {
    it('should return true if the event is a actor event and contains source actor type', () => {
      const event = stubDocumentEvent({
        metadata: {
          attributes: [
            stubDocumentEventAttribute({
              name: DocumentEventAttributeName.ACTOR_TYPE,
              value: DocumentEventActorType.SOURCE,
            }),
          ],
        },
        name: DocumentEventName.ACTOR,
      });

      const result = isActorEventWithSourceActorType(event);

      expect(result).toBe(true);
    });

    it('should return false if the event is a actor event and not contains source actor type', () => {
      const event = stubDocumentEvent({
        metadata: undefined,
        name: DocumentEventName.ACTOR,
      });

      const result = isActorEventWithSourceActorType(event);

      expect(result).toBe(false);
    });

    it('should return false if the event is not a actor event and contains source actor type', () => {
      const event = stubDocumentEvent({
        metadata: {
          attributes: [
            stubDocumentEventAttribute({
              name: DocumentEventAttributeName.ACTOR_TYPE,
              value: DocumentEventActorType.SOURCE,
            }),
          ],
        },
        name: DocumentEventName.OPEN,
      });

      const result = isActorEventWithSourceActorType(event);

      expect(result).toBe(false);
    });
  });

  describe('eventHasNonEmptyStringAttribute', () => {
    it('should return true if the attribute is a non-empty string', () => {
      const name = stubEnumValue(DocumentEventAttributeName);
      const attribute = stubDocumentEventAttribute({
        name,
        value: faker.string.sample(),
      });
      const event = stubDocumentEvent({
        metadata: { attributes: [attribute] },
      });

      const result = eventHasNonEmptyStringAttribute(event, name);

      expect(result).toBe(true);
    });

    it('should return false if the attribute is an empty string', () => {
      const name = stubEnumValue(DocumentEventAttributeName);
      const attribute = stubDocumentEventAttribute({ name, value: '' });
      const event = stubDocumentEvent({
        metadata: { attributes: [attribute] },
      });

      const result = eventHasNonEmptyStringAttribute(event, name);

      expect(result).toBe(false);
    });

    it('should return false if the attribute is not a string', () => {
      const name = stubEnumValue(DocumentEventAttributeName);
      const attribute = stubDocumentEventAttribute({
        name,
        value: faker.number.int(),
      });
      const event = stubDocumentEvent({
        metadata: { attributes: [attribute] },
      });

      const result = eventHasNonEmptyStringAttribute(event, name);

      expect(result).toBe(false);
    });

    it('should return false if the event metadata is undefined', () => {
      const name = stubEnumValue(DocumentEventAttributeName);
      const event = stubDocumentEvent({
        metadata: undefined,
      });

      const result = eventHasNonEmptyStringAttribute(event, name);

      expect(result).toBe(false);
    });
  });

  describe('hasWeightFormat', () => {
    it('should return true if the weight format is valid', () => {
      const weight = `${faker.number.float()} KG`;

      const result = hasWeightFormat(weight);

      expect(result).toBe(true);
    });

    it('should return false if the weight format is invalid', () => {
      const weight = `${faker.number.float()} ${faker.string.sample()}`;

      const result = hasWeightFormat(weight);

      expect(result).toBe(false);
    });

    it('should return false if the weight format is undefined', () => {
      const result = hasWeightFormat(undefined);

      expect(result).toBe(false);
    });
  });

  describe('eventHasMetadataAttribute', () => {
    it('should return true if the event has the metadata attribute name', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
          value: faker.string.sample(),
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      });

      expect(result).toBe(true);
    });

    it('should return false if the event is undefined', () => {
      const result = eventHasMetadataAttribute({
        event: {} as DocumentEvent,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      });

      expect(result).toBe(false);
    });

    it('should return false if the event metadata value is undefined', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.ACTOR],
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      });

      expect(result).toBe(false);
    });

    it('should return false if the event metadata name is not equal to the metadata value', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
          value: faker.string.sample(),
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
        metadataValues: faker.string.sample(),
      });

      expect(result).toBe(false);
    });

    it('should return true if the event has the metadata attribute name with some metadata values', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DocumentEventMoveType.DROP_OFF,
        }),
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DocumentEventMoveType.PICK_UP,
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.MOVE_TYPE,
        metadataValues: [
          DocumentEventMoveType.DROP_OFF,
          DocumentEventMoveType.PICK_UP,
        ],
      });

      expect(result).toBe(true);
    });

    it('should return true if the event has the some event name and metadata attribute value', () => {
      const event = stubDocumentEvent({
        ...stubDocumentEventWithMetadata([
          stubDocumentEventAttribute({
            name: DocumentEventAttributeName.MOVE_TYPE,
            value: DocumentEventMoveType.PICK_UP,
          }),
        ]),
        name: DocumentEventName.OPEN,
      });

      const result = eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.OPEN, DocumentEventName.MOVE],
        metadataName: DocumentEventAttributeName.MOVE_TYPE,
        metadataValues: DocumentEventMoveType.PICK_UP,
      });

      expect(result).toBe(true);
    });
  });

  describe('eventsHasSameMetadataAttributeValue', () => {
    it('should return true if the events has the same metadata attribute value', () => {
      const events = stubArray(() =>
        stubDocumentEventWithMetadata([
          stubDocumentEventAttribute({
            name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
            value: 1234,
          }),
        ]),
      );

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      );

      expect(result).toBe(true);
    });

    it('should return false if the events do not have the same metadata attribute value', () => {
      const events = stubArray(
        () =>
          stubDocumentEventWithMetadata([
            stubDocumentEventAttribute({
              name: DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
              value: faker.number.float(),
            }),
          ]),
        3,
      );

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      );

      expect(result).toBe(false);
    });

    it('should return false if events has empty', () => {
      const events = [] as unknown as Array<DocumentEvent>;

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN_IDENTIFIED,
      );

      expect(result).toBe(false);
    });
  });
});

describe('eventHasCarrotParticipant', () => {
  it.each([
    {
      dataSetName: DataSetName.PROD,
      expected: true,
      id: CARROT_PARTICIPANT_BY_ENVIRONMENT.development.PROD.id,
    },
    {
      dataSetName: DataSetName.TEST,
      expected: true,
      id: CARROT_PARTICIPANT_BY_ENVIRONMENT.production.TEST.id,
    },
    {
      dataSetName: DataSetName.PROD_SIMULATION,
      expected: true,
      id: CARROT_PARTICIPANT_BY_ENVIRONMENT.production.PROD_SIMULATION.id,
    },
    { dataSetName: DataSetName.PROD, expected: false, id: faker.string.uuid() },
  ])(
    'should return $expected if id is $id',
    ({ dataSetName, expected, id }) => {
      const event = stubDocumentEvent({ participant: { id } });

      const result = eventHasCarrotParticipant(event, dataSetName);

      expect(result).toBe(expected);
    },
  );
});
