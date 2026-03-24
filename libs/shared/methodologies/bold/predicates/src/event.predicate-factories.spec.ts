import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { type DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
  metadataAttributeNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
  metadataAttributeValueIsNotEmpty,
  not,
} from './event.predicate-factories';

describe('Predicate Factories', () => {
  describe('and', () => {
    it('should return true if all arguments return true', () => {
      const event = stubDocumentEvent();

      const condition = and<DocumentEvent>(
        (input) => input.id === event.id,
        (input) => input.address.id === event.address.id,
        (input) => input.participant.id === event.participant.id,
      );

      expect(condition(event)).toBe(true);
    });

    it('should return false if an argument return false', () => {
      const event = stubDocumentEvent();

      const condition = and<DocumentEvent>(
        (input) => input.id === faker.string.uuid(),
        (input) => input.address.id === event.address.id,
        (input) => input.participant.id === event.participant.id,
      );

      expect(condition(event)).toBe(false);
    });
  });

  describe('not', () => {
    it('should return false if argument return true', () => {
      const event = stubDocumentEvent();

      const condition = not<DocumentEvent>((input) => input.id === event.id);

      expect(condition(event)).toBe(false);
    });

    it('should return true if argument return false', () => {
      const event = stubDocumentEvent();

      const condition = not<DocumentEvent>(
        (input) => input.id === faker.string.uuid(),
      );

      expect(condition(event)).toBe(true);
    });
  });

  describe('eventNameIsAnyOf', () => {
    it('should return true if the event has any of the specified names', () => {
      const event = stubDocumentEvent({ name: 'MOVE' });

      expect(eventNameIsAnyOf(['MOVE', 'ACTOR'])(event)).toBe(true);
    });

    it('should return false if the event has none of the specified names', () => {
      const event = stubDocumentEvent({ name: 'ACTOR' });

      expect(eventNameIsAnyOf(['MOVE', 'Drop-off'])(event)).toBe(false);
    });
  });

  describe('eventLabelIsAnyOf', () => {
    it('should return true if the event has any of the specified labels', () => {
      const event = stubDocumentEvent({ label: 'Hauler' });

      expect(eventLabelIsAnyOf(['Hauler', 'Recycler'])(event)).toBe(true);
    });

    it('should return false if the event has none of the specified labels', () => {
      const event = stubDocumentEvent({ label: 'Waste Generator' });

      expect(eventLabelIsAnyOf(['Hauler', 'Recycler'])(event)).toBe(false);
    });
  });

  describe('metadataAttributeNameIsAnyOf', () => {
    it('should return true if the event has any of the specified metadata attribute names', () => {
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', faker.string.sample()],
      ]);

      expect(
        metadataAttributeNameIsAnyOf(['Description', 'Document Number'])(event),
      ).toBe(true);
    });

    it('should return false if the event has none of the specified metadata attribute names', () => {
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', faker.string.sample()],
      ]);

      expect(
        metadataAttributeNameIsAnyOf(['Container Type', 'Document Number'])(
          event,
        ),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsAnyOf', () => {
    it('should return true if the metadata attribute has any of the specified values', () => {
      const description = faker.string.sample();
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', description],
      ]);

      expect(
        metadataAttributeValueIsAnyOf('Description', [
          description,
          faker.string.sample(),
        ])(event),
      ).toBe(true);
    });

    it('should return false if the metadata attribute has none of the specified values', () => {
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', faker.string.sample()],
      ]);

      expect(
        metadataAttributeValueIsAnyOf('Description', [
          faker.string.sample(),
          faker.string.sample(),
        ])(event),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsNotEmpty', () => {
    it('should return true if the metadata attribute value is not empty', () => {
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', faker.string.sample()],
      ]);

      expect(metadataAttributeValueIsNotEmpty('Description')(event)).toBe(true);
    });

    it('should return false if the metadata attribute value is empty', () => {
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        ['Description', undefined as any], // necessary cast to reuse stub
      ]);

      expect(metadataAttributeValueIsNotEmpty('Description')(event)).toBe(
        false,
      );
    });
  });
});
