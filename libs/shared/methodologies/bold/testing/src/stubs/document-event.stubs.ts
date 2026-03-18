import type { PartialDeep } from 'type-fest';

import {
  type DocumentEvent,
  type DocumentEventAttribute,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  type AnyObject,
  type MethodologyDocumentEventAttachment,
  type MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import { stubAddress } from './address.stubs';
import { stubAuthor, stubParticipant } from './participant.stubs';

/**
 * Well-known Symbol used to attach the list of explicitly-provided metadata
 * attribute names to a DocumentEvent stub.  The normalizer in
 * generate-application-rules-manifest.ts reads this to filter out default
 * (noise) attributes from manifest examples.
 */
export const EXPLICIT_ATTRIBUTES: unique symbol = Symbol.for(
  'manifest:explicitAttributes',
);

const isPropertyOverridenWithUndefined = <T extends AnyObject>(
  item: T,
  key: keyof T,
  // eslint-disable-next-line security/detect-object-injection
) => Object.hasOwn(item, key) && item[key] === undefined;

export const stubDocumentEvent = (
  partialEvent: PartialDeep<DocumentEvent> = {},
): DocumentEvent => ({
  externalCreatedAt: faker.date.recent().toISOString(),
  id: faker.string.uuid(),
  isPublic: faker.datatype.boolean(),
  name: stubEnumValue(DocumentEventName),
  ...partialEvent,
  address: stubAddress(partialEvent.address),
  author: stubAuthor(partialEvent.author),
  participant: stubParticipant(partialEvent.participant),
  relatedDocument: isPropertyOverridenWithUndefined(
    partialEvent,
    'relatedDocument',
  )
    ? undefined
    : {
        documentId: faker.string.uuid(),
        ...partialEvent.relatedDocument,
      },
});

export const stubDocumentEventAttachment = (
  partialInput: Partial<MethodologyDocumentEventAttachment> = {},
): MethodologyDocumentEventAttachment => ({
  attachmentId: faker.string.uuid(),
  contentLength: faker.number.int({ max: 10_000, min: 0 }),
  isPublic: faker.datatype.boolean(),
  label: faker.lorem.word(),
  ...partialInput,
});

export const stubDocumentEventWithMetadata = (
  attributes: DocumentEventAttribute[],
): DocumentEvent =>
  stubDocumentEvent({
    metadata: {
      attributes,
    },
  });

export const stubDocumentEventAttribute = (
  partialInput: Partial<DocumentEventAttribute> = {},
): DocumentEventAttribute => ({
  isPublic: faker.datatype.boolean(),
  name: stubEnumValue(DocumentEventAttributeName),
  value: faker.lorem.word(),
  ...partialInput,
});

export const stubActorEventWithLabel = (
  eventLavel: DocumentEvent['label'],
  partialEvent?: PartialDeep<DocumentEvent>,
): DocumentEvent =>
  stubDocumentEvent({
    ...partialEvent,
    label: eventLavel,
    name: DocumentEventName.ACTOR,
  });

export const stubDocumentEventWithMetadataAttributes = (
  partialEvent?: PartialDeep<DocumentEvent>,
  attributes?: Array<
    | [
        DocumentEventAttributeName | string,
        MethodologyDocumentEventAttributeValue,
      ]
    | Omit<DocumentEventAttribute, 'isPublic'>
  >,
) =>
  stubDocumentEvent({
    ...partialEvent,
    metadata: {
      attributes: attributes?.map((attribute) => {
        if (Array.isArray(attribute)) {
          return {
            isPublic: faker.datatype.boolean(),
            name: attribute[0],
            value: attribute[1],
          };
        }

        return {
          format: attribute.format,
          isPublic: faker.datatype.boolean(),
          name: attribute.name,
          sensitive: attribute.sensitive,
          type: attribute.type,
          value: attribute.value,
        };
      }),
    },
  });
