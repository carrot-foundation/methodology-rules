import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';
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
      const { MOVE, OPEN } = DocumentEventName;
      const event = stubDocumentEvent({ name: MOVE });

      expect(eventNameIsAnyOf([MOVE, OPEN])(event)).toBe(true);
    });

    it('should return false if the event has none of the specified names', () => {
      const { ACTOR, MOVE, OPEN } = DocumentEventName;
      const event = stubDocumentEvent({ name: ACTOR });

      expect(eventNameIsAnyOf([MOVE, OPEN])(event)).toBe(false);
    });
  });

  describe('eventLabelIsAnyOf', () => {
    it('should return true if the event has any of the specified labels', () => {
      const { HAULER, RECYCLER } = MethodologyDocumentEventLabel;
      const event = stubDocumentEvent({ label: HAULER });

      expect(eventLabelIsAnyOf([HAULER, RECYCLER])(event)).toBe(true);
    });

    it('should return false if the event has none of the specified labels', () => {
      const { HAULER, RECYCLER, WASTE_GENERATOR } =
        MethodologyDocumentEventLabel;
      const event = stubDocumentEvent({ label: WASTE_GENERATOR });

      expect(eventLabelIsAnyOf([HAULER, RECYCLER])(event)).toBe(false);
    });
  });

  describe('metadataAttributeNameIsAnyOf', () => {
    it('should return true if the event has any of the specified metadata attribute names', () => {
      const { DESCRIPTION, DOCUMENT_NUMBER } = DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, faker.string.sample()],
      ]);

      expect(
        metadataAttributeNameIsAnyOf([DESCRIPTION, DOCUMENT_NUMBER])(event),
      ).toBe(true);
    });

    it('should return false if the event has none of the specified metadata attribute names', () => {
      const { CONTAINER_TYPE, DESCRIPTION, DOCUMENT_NUMBER } =
        DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, faker.string.sample()],
      ]);

      expect(
        metadataAttributeNameIsAnyOf([CONTAINER_TYPE, DOCUMENT_NUMBER])(event),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsAnyOf', () => {
    it('should return true if the metadata attribute has any of the specified values', () => {
      const { DESCRIPTION } = DocumentEventAttributeName;
      const description = faker.string.sample();
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, description],
      ]);

      expect(
        metadataAttributeValueIsAnyOf(DESCRIPTION, [
          description,
          faker.string.sample(),
        ])(event),
      ).toBe(true);
    });

    it('should return false if the metadata attribute has none of the specified values', () => {
      const { DESCRIPTION } = DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, faker.string.sample()],
      ]);

      expect(
        metadataAttributeValueIsAnyOf(DESCRIPTION, [
          faker.string.sample(),
          faker.string.sample(),
        ])(event),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsNotEmpty', () => {
    it('should return true if the metadata attribute value is not empty', () => {
      const { DESCRIPTION } = DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, faker.string.sample()],
      ]);

      expect(metadataAttributeValueIsNotEmpty(DESCRIPTION)(event)).toBe(true);
    });

    it('should return false if the metadata attribute value is empty', () => {
      const { DESCRIPTION } = DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [DESCRIPTION, undefined as any], // necessary cast to reuse stub
      ]);

      expect(metadataAttributeValueIsNotEmpty(DESCRIPTION)(event)).toBe(false);
    });
  });
});
