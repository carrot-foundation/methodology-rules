import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getEventAttributeValue } from './event.getters';

const { ACTOR, DROP_OFF, OPEN, PICK_UP, RULES_METADATA } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIDDocumentActorType;

export const getAuditorActorEvent = (
  document: Document,
): DocumentEvent | undefined =>
  document.externalEvents?.find(
    (event) =>
      event.name === ACTOR.toString() &&
      getEventAttributeValue(event, ACTOR_TYPE) === AUDITOR,
  );

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
}): MassIDDocumentActorType | undefined => {
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
