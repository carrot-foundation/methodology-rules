import {
  stubDocumentEvent,
  stubDocumentEventAttachment,
  stubDocumentEventAttribute,
  stubDocumentEventWithMetadata,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { validateNonEmptyString } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { faker } from '@faker-js/faker';

import {
  getDocumentEventAttachmentByLabel,
  getEventAttributeValue,
  getEventAttributeValueOrThrow,
  getEventMethodologySlug,
} from './event.getters';

const { ACTOR } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE, METHODOLOGY_SLUG } = DocumentEventAttributeName;

describe('Event getters', () => {
  describe('getEventAttributeValue', () => {
    it('should return the attribute value', () => {
      const attribute = stubDocumentEventAttribute();
      const event = stubDocumentEventWithMetadata([attribute]);

      const result = getEventAttributeValue(event, attribute.name);

      expect(result).toBe(attribute.value);
    });

    it('should return REJECTED if the event does not have attributes', () => {
      const event = stubDocumentEventWithMetadata([]);

      const result = getEventAttributeValue(event, faker.string.sample());

      expect(result).toBe(undefined);
    });
  });

  describe('getEventAttributeValueOrThrow', () => {
    it('should return the attribute value', () => {
      const attribute = stubDocumentEventAttribute({
        value: faker.string.sample(),
      });
      const event = stubDocumentEventWithMetadata([attribute]);

      const result = getEventAttributeValueOrThrow(
        event,
        attribute.name,
        validateNonEmptyString,
      );

      expect(result).toBe(attribute.value);
    });

    it('should throw an error if the attribute is missing', () => {
      const event = stubDocumentEventWithMetadata([]);

      expect(() =>
        getEventAttributeValueOrThrow(event, 'missing', validateNonEmptyString),
      ).toThrow('Required metadata missing attribute is missing');
    });
  });

  describe('getDocumentEventAttachmentByLabel', () => {
    it('should return the attachment', () => {
      const attachment = stubDocumentEventAttachment();
      const event = stubDocumentEvent({
        attachments: [attachment],
      });

      const result = getDocumentEventAttachmentByLabel(event, attachment.label);

      expect(result).toEqual(attachment);
    });

    it('should return REJECTED if the attachment does not exist', () => {
      const attachment = stubDocumentEventAttachment();
      const event = stubDocumentEvent({
        attachments: [attachment],
      });

      const result = getDocumentEventAttachmentByLabel(
        event,
        faker.string.sample(),
      );

      expect(result).toBe(undefined);
    });

    it('should return REJECTED if the event attachments is undefined', () => {
      const event = stubDocumentEvent({
        attachments: undefined,
      });

      const result = getDocumentEventAttachmentByLabel(
        event,
        faker.string.sample(),
      );

      expect(result).toBe(undefined);
    });
  });

  describe('getEventMethodologySlug', () => {
    it('should return the methodology slug', () => {
      const methodologySlug = faker.string.sample();

      const event = stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
        [ACTOR_TYPE, AUDITOR],
        [METHODOLOGY_SLUG, methodologySlug],
      ]);

      const result = getEventMethodologySlug(event);

      expect(result).toBe(methodologySlug);
    });

    it('should return undefined if the event does not have methodology slug', () => {
      const event = stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
        [ACTOR_TYPE, AUDITOR],
      ]);

      const result = getEventMethodologySlug(event);

      expect(result).toBe(undefined);
    });
  });
});
