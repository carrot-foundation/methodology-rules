import type { Maybe } from '@carrot-fndn/shared/types';

import {
  type DocumentEvent,
  type DocumentEventAttachment,
  DocumentEventAttributeName,
  type DocumentEventAttributeValue,
  type DocumentEventWithAttachments,
  type DocumentEventWithMetadata,
} from '@carrot-fndn/methodologies/bold/types';
import { getNonEmptyString } from '@carrot-fndn/shared/helpers';
import { createValidate, validate } from 'typia';

export const getEventAttributeValue = (
  event: Maybe<DocumentEvent>,
  attributeName: DocumentEventAttributeName | string,
): DocumentEventAttributeValue | undefined => {
  const validation = validate<DocumentEventWithMetadata>(event);

  if (validation.success) {
    const foundAttribute = validation.data.metadata.attributes.find(
      (attribute) => attribute.name === attributeName,
    );

    return foundAttribute?.value;
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
): DocumentEventAttachment | undefined => {
  const validation = validate<DocumentEventWithAttachments>(event);

  if (validation.success) {
    return validation.data.attachments.find(
      (attachment) => attachment.label === label,
    );
  }

  return undefined;
};

export const getEventMethodologySlug = (
  event: Maybe<DocumentEvent>,
): DocumentEventAttributeValue | undefined =>
  getNonEmptyString(
    getEventAttributeValue(event, DocumentEventAttributeName.METHODOLOGY_SLUG),
  );
