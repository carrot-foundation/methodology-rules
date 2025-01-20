import {
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { faker } from '@faker-js/faker';

import {
  and,
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

  describe('metadataAttributeNameIsAnyOf', () => {
    it('should return true if the event has any of the specified metadata attribute names', () => {
      const { ACTOR_TYPE, MOVE_TYPE } = DocumentEventAttributeName;
      const { PICK_UP } = DocumentEventMoveType;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, PICK_UP],
      ]);

      expect(metadataAttributeNameIsAnyOf([ACTOR_TYPE, MOVE_TYPE])(event)).toBe(
        true,
      );
    });

    it('should return false if the event has none of the specified metadata attribute names', () => {
      const { ACTOR_TYPE, MOVE_TYPE, REPORT_TYPE } = DocumentEventAttributeName;
      const { PICK_UP } = DocumentEventMoveType;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, PICK_UP],
      ]);

      expect(
        metadataAttributeNameIsAnyOf([ACTOR_TYPE, REPORT_TYPE])(event),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsAnyOf', () => {
    it('should return true if the metadata attribute has any of the specified values', () => {
      const { MOVE_TYPE } = DocumentEventAttributeName;
      const { DROP_OFF, PICK_UP } = DocumentEventMoveType;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, PICK_UP],
      ]);

      expect(
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, DROP_OFF])(event),
      ).toBe(true);
    });

    it('should return false if the metadata attribute has none of the specified values', () => {
      const { MOVE_TYPE } = DocumentEventAttributeName;
      const { DROP_OFF, PICK_UP, WEIGHING } = DocumentEventMoveType;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, PICK_UP],
      ]);

      expect(
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [WEIGHING, DROP_OFF])(event),
      ).toBe(false);
    });
  });

  describe('metadataAttributeValueIsNotEmpty', () => {
    it('should return true if the metadata attribute value is not empty', () => {
      const { MOVE_TYPE } = DocumentEventAttributeName;
      const { PICK_UP } = DocumentEventMoveType;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, PICK_UP],
      ]);

      expect(metadataAttributeValueIsNotEmpty(MOVE_TYPE)(event)).toBe(true);
    });

    it('should return false if the metadata attribute value is empty', () => {
      const { MOVE_TYPE } = DocumentEventAttributeName;
      const event = stubDocumentEventWithMetadataAttributes(undefined, [
        [MOVE_TYPE, undefined as any], // necessary cast to reuse stub
      ]);

      expect(metadataAttributeValueIsNotEmpty(MOVE_TYPE)(event)).toBe(false);
    });
  });
});
