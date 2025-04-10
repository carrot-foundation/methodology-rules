import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getEventAttributeValue } from './event.getters';

const { DROP_OFF, OPEN, PICK_UP, RULES_METADATA } = DocumentEventName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;

export const getDocumentEventById = (
  document: Document,
  eventId: string,
): DocumentEvent | undefined =>
  document.externalEvents?.find((event) => event.id === eventId);

export const getFirstDocumentEventAttributeValue = (
  document: Document | undefined,
  attributeName: DocumentEventAttributeName,
): MethodologyDocumentEventAttributeValue | undefined => {
  if (!document) {
    return undefined;
  }

  const { externalEvents } = document;

  if (!isNonEmptyArray(externalEvents)) {
    return undefined;
  }

  for (const event of externalEvents) {
    const attributeValue = getEventAttributeValue(event, attributeName);

    if (attributeValue !== undefined) {
      return attributeValue;
    }
  }

  return undefined;
};

export const getOpenEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find((event) => event.name === OPEN.toString());

export const getRulesMetadataEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) => event.name === RULES_METADATA.toString(),
  );

export const getParticipantActorType = ({
  document,
  event,
}: {
  document: Document;
  event: DocumentEvent;
}): MassIdDocumentActorType | undefined => {
  const events = document.externalEvents;

  if (!isNonEmptyArray(events)) {
    return undefined;
  }

  const pickUpEvents = events.filter((e) => e.name === PICK_UP.toString());
  const dropOffEvents = events.filter((e) => e.name === DROP_OFF.toString());

  if (!isNonEmptyArray(pickUpEvents) || !isNonEmptyArray(dropOffEvents)) {
    return undefined;
  }

  const sourcePickUp = pickUpEvents[0] as DocumentEvent;
  const finalDropOff = dropOffEvents.at(-1) as DocumentEvent;

  if (sourcePickUp.id === event.id) {
    return WASTE_GENERATOR;
  }

  if (finalDropOff.id === event.id) {
    return RECYCLER;
  }

  if (event.name === PICK_UP.toString() || event.name === DROP_OFF.toString()) {
    return PROCESSOR;
  }

  return undefined;
};
