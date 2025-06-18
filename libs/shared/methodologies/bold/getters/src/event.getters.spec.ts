import {
  stubDocumentEvent,
  stubDocumentEventAttachment,
  stubDocumentEventAttribute,
  stubDocumentEventWithMetadata,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { validateNonEmptyString } from '@carrot-fndn/shared/methodologies/bold/utils';
import { faker } from '@faker-js/faker';

import {
  getDocumentEventAttachmentByLabel,
  getEventAttributeByName,
  getEventAttributeValue,
  getEventAttributeValueOrThrow,
  getEventMethodologySlug,
} from './event.getters';

const { ACTOR } = DocumentEventName;
const { DESCRIPTION, METHODOLOGY_SLUG } = DocumentEventAttributeName;

describe('Event getters', () => {
  describe('getEventAttributeValue', () => {
    it('should return the attribute value', () => {
      const attribute = stubDocumentEventAttribute();
      const event = stubDocumentEventWithMetadata([attribute]);

      const result = getEventAttributeValue(event, attribute.name);

      expect(result).toBe(attribute.value);
    });

    it('should return FAILED if the event does not have attributes', () => {
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

    it('should return FAILED if the attachment does not exist', () => {
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

    it('should return FAILED if the event attachments is undefined', () => {
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
        [METHODOLOGY_SLUG, methodologySlug],
      ]);

      const result = getEventMethodologySlug(event);

      expect(result).toBe(methodologySlug);
    });

    it('should return undefined if the event does not have methodology slug', () => {
      const event = stubDocumentEventWithMetadataAttributes({ name: ACTOR });

      const result = getEventMethodologySlug(event);

      expect(result).toBe(undefined);
    });
  });

  describe('getEventAttributeByName', () => {
    it('should return the correct attribute', () => {
      const description = faker.string.sample();
      const event = stubDocumentEventWithMetadataAttributes({}, [
        [DESCRIPTION, description],
      ]);

      const result = getEventAttributeByName(event, DESCRIPTION);

      expect(result).toEqual(
        expect.objectContaining({
          name: DESCRIPTION,
          value: description,
        }),
      );
    });

    it('should return undefined if the attribute does not exist', () => {
      const event = stubDocumentEventWithMetadataAttributes({}, [
        [DESCRIPTION, faker.string.sample()],
      ]);

      const result = getEventAttributeByName(event, 'missing');

      expect(result).toBeUndefined();
    });

    it('should return undefined if the event does not have metadata', () => {
      const event = stubDocumentEvent();

      const result = getEventAttributeByName(event, DESCRIPTION);

      expect(result).toBeUndefined();
    });

    it('should return undefined if the event does not have metadata attributes', () => {
      const event = stubDocumentEvent({
        metadata: undefined,
      });

      const result = getEventAttributeByName(event, DESCRIPTION);

      expect(result).toBeUndefined();
    });
  });
});
