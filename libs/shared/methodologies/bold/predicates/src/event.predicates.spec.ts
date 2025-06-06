import {
  stubDocumentEvent,
  stubDocumentEventAttribute,
  stubDocumentEventWithMetadata,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import { stubArray, stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  DataSetName,
  MethodologyDocumentEventLabel,
  MethodologyParticipantType,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import {
  eventHasActorParticipant,
  eventHasCarrotParticipant,
  eventHasLabel,
  eventHasMetadataAttribute,
  eventHasName,
  eventHasNonEmptyStringAttribute,
  eventsHasSameMetadataAttributeValue,
  hasWeightFormat,
  isActorEvent,
  isRecycledEvent,
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

  describe('eventHasLabel', () => {
    const { RECYCLER } = MethodologyDocumentEventLabel;

    it('should return true if the event has the label', () => {
      const event = stubDocumentEvent({ label: RECYCLER });

      expect(eventHasLabel(event, RECYCLER)).toBe(true);
    });

    it('should return false if the event does not have the label', () => {
      const event = stubDocumentEvent({ label: faker.string.sample() });

      expect(eventHasLabel(event, RECYCLER)).toBe(false);
    });
  });

  describe('isRecycledEvent', () => {
    it('should return true if the event is a recycled event', () => {
      const event = stubDocumentEvent({ name: DocumentEventName.RECYCLED });

      expect(isRecycledEvent(event)).toBe(true);
    });

    it('should return false if the event is not a recycled event', () => {
      const event = stubDocumentEvent({ name: DocumentEventName.ACTOR });

      expect(isRecycledEvent(event)).toBe(false);
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
        name: DocumentEventName.CLOSE,
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
        name: DocumentEventName.CLOSE,
      });

      const result = isActorEvent(event);

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
      const weight = `${faker.number.float()} ${MeasurementUnit.KG}`;

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
          name: DocumentEventAttributeName.WASTE_ORIGIN,
          value: faker.string.sample(),
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN,
      });

      expect(result).toBe(true);
    });

    it('should return false if the event is undefined', () => {
      const result = eventHasMetadataAttribute({
        event: {} as DocumentEvent,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN,
      });

      expect(result).toBe(false);
    });

    it('should return false if the event metadata value is undefined', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.ACTOR],
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN,
      });

      expect(result).toBe(false);
    });

    it('should return false if the event metadata name is not equal to the metadata value', () => {
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.WASTE_ORIGIN,
          value: faker.string.sample(),
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.WASTE_ORIGIN,
        metadataValues: faker.string.sample(),
      });

      expect(result).toBe(false);
    });

    it('should return true if the event has the metadata attribute name with some metadata values', () => {
      const description1 = faker.string.sample();
      const description2 = faker.string.sample();
      const event = stubDocumentEventWithMetadata([
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.DESCRIPTION,
          value: description1,
        }),
        stubDocumentEventAttribute({
          name: DocumentEventAttributeName.DESCRIPTION,
          value: description2,
        }),
      ]);

      const result = eventHasMetadataAttribute({
        event,
        metadataName: DocumentEventAttributeName.DESCRIPTION,
        metadataValues: [description1, description2],
      });

      expect(result).toBe(true);
    });

    it('should return true if the event has the some event name and metadata attribute value', () => {
      const description = faker.string.sample();
      const event = stubDocumentEvent({
        ...stubDocumentEventWithMetadata([
          stubDocumentEventAttribute({
            name: DocumentEventAttributeName.DESCRIPTION,
            value: description,
          }),
        ]),
        name: DocumentEventName.DROP_OFF,
      });

      const result = eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.DROP_OFF, DocumentEventName.MOVE],
        metadataName: DocumentEventAttributeName.DESCRIPTION,
        metadataValues: [description],
      });

      expect(result).toBe(true);
    });
  });

  describe('eventsHasSameMetadataAttributeValue', () => {
    it('should return true if the events has the same metadata attribute value', () => {
      const events = stubArray(() =>
        stubDocumentEventWithMetadata([
          stubDocumentEventAttribute({
            name: DocumentEventAttributeName.WASTE_ORIGIN,
            value: 1234,
          }),
        ]),
      );

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN,
      );

      expect(result).toBe(true);
    });

    it('should return false if the events do not have the same metadata attribute value', () => {
      const events = stubArray(
        () =>
          stubDocumentEventWithMetadata([
            stubDocumentEventAttribute({
              name: DocumentEventAttributeName.WASTE_ORIGIN,
              value: faker.number.float(),
            }),
          ]),
        3,
      );

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN,
      );

      expect(result).toBe(false);
    });

    it('should return false if events has empty', () => {
      const events = [] as unknown as DocumentEvent[];

      const result = eventsHasSameMetadataAttributeValue(
        events,
        DocumentEventAttributeName.WASTE_ORIGIN,
      );

      expect(result).toBe(false);
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
      {
        dataSetName: DataSetName.PROD,
        expected: false,
        id: faker.string.uuid(),
      },
    ])(
      'should return $expected if id is $id',
      ({ dataSetName, expected, id }) => {
        const event = stubDocumentEvent({ participant: { id } });

        const result = eventHasCarrotParticipant(event, dataSetName);

        expect(result).toBe(expected);
      },
    );
  });
});
