import type {
  Maybe,
  MethodologyDocumentEventAttachment,
  MethodologyDocumentEventAttribute,
  MethodologyDocumentEventAttributeValue,
} from '@carrot-fndn/shared/types';

import { getNonEmptyString } from '@carrot-fndn/shared/helpers';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  type DocumentEventWithAttachments,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { createValidate, validate } from 'typia';

import { validateDocumentEventWithMetadata } from './event.getters.typia';

export const getEventAttributeValue = (
  event: Maybe<DocumentEvent>,
  attributeName: DocumentEventAttributeName | string,
): MethodologyDocumentEventAttributeValue | undefined => {
  const validation = validateDocumentEventWithMetadata(event);

  if (validation.success) {
    const foundAttribute = validation.data.metadata.attributes.find(
      (attribute) => attribute.name === attributeName,
    );

    return foundAttribute?.value;
  }

  return undefined;
};

export const getEventAttributeByName = (
  event: Maybe<DocumentEvent>,
  attributeName: DocumentEventAttributeName | string,
): MethodologyDocumentEventAttribute | undefined => {
  const validation = validateDocumentEventWithMetadata(event);

  if (validation.success) {
    return validation.data.metadata.attributes.find(
      (attribute) => attribute.name === attributeName,
    );
  }

  return undefined;
};

export const getEventAttributeValueOrThrow = <T>(
  event: Maybe<DocumentEvent>,
  attributeName: DocumentEventAttributeName | string,
  validateValue: ReturnType<typeof createValidate<T>>,
): T => {
  const value = getEventAttributeValue(event, attributeName);
  const validation = validateValue(value);

  if (!validation.success) {
    throw new Error(`Required metadata ${attributeName} attribute is missing`);
  }

  return validation.data;
};

export const getDocumentEventAttachmentByLabel = (
  event: DocumentEvent,
  label: string,
): MethodologyDocumentEventAttachment | undefined => {
  const validation = validate<DocumentEventWithAttachments>(event);

  if (validation.success) {
    return validation.data.attachments.find(
      (attachment) => attachment.label === label,
    );
  }

  return undefined;
};

export const getFirstDocumentEventAttachment = (
  event: DocumentEvent,
): MethodologyDocumentEventAttachment | undefined => {
  const validation = validate<DocumentEventWithAttachments>(event);

  if (validation.success) {
    return validation.data.attachments[0];
  }

  return undefined;
};

export const getEventMethodologySlug = (
  event: Maybe<DocumentEvent>,
): MethodologyDocumentEventAttributeValue | undefined =>
  getNonEmptyString(
    getEventAttributeValue(event, DocumentEventAttributeName.METHODOLOGY_SLUG),
  );
