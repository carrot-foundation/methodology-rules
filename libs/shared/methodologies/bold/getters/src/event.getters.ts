import type {
  BoldAttributeValue,
  DocumentEventAttachment,
  Maybe,
} from '@carrot-fndn/shared/types';

import { getNonEmptyString } from '@carrot-fndn/shared/helpers';
import {
  BoldAttributeName,
  type BoldDocumentEvent,
  type BoldDocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  validateDocumentEventWithAttachments,
  validateDocumentEventWithMetadata,
} from './event.getters.validators';

export const getEventAttributeValue = (
  event: Maybe<BoldDocumentEvent>,
  attributeName: BoldAttributeName,
): BoldAttributeValue | undefined => {
  const validation = validateDocumentEventWithMetadata(event);

  if (validation.success) {
    const foundAttribute = validation.data.metadata.attributes.find(
      (attribute) => attribute.name === attributeName,
    );

    return foundAttribute?.value as BoldAttributeValue | undefined;
  }

  return undefined;
};

export const getEventAttributeByName = (
  event: Maybe<BoldDocumentEvent>,
  attributeName: BoldAttributeName,
): BoldDocumentEventAttribute | undefined => {
  const validation = validateDocumentEventWithMetadata(event);

  if (validation.success) {
    return validation.data.metadata.attributes.find(
      (attribute) => attribute.name === attributeName,
    ) as BoldDocumentEventAttribute | undefined;
  }

  return undefined;
};

export const getEventAttributeValueOrThrow = <T>(
  event: Maybe<BoldDocumentEvent>,
  attributeName: BoldAttributeName,
  validateValue: (
    input: unknown,
  ) => { data: T; success: true } | { success: false },
): T => {
  const value = getEventAttributeValue(event, attributeName);
  const validation = validateValue(value);

  if (!validation.success) {
    throw new Error(`Required metadata ${attributeName} attribute is missing`);
  }

  return validation.data;
};

export const getDocumentEventAttachmentByLabel = (
  event: BoldDocumentEvent,
  label: string,
): DocumentEventAttachment | undefined => {
  const validation = validateDocumentEventWithAttachments(event);

  if (validation.success) {
    return validation.data.attachments.find(
      (attachment) => attachment.label === label,
    );
  }

  return undefined;
};

export const getEventMethodologySlug = (
  event: Maybe<BoldDocumentEvent>,
): BoldAttributeValue | undefined =>
  getNonEmptyString(
    getEventAttributeValue(event, BoldAttributeName.METHODOLOGY_SLUG),
  );
