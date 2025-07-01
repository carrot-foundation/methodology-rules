import {
  assertNonEmptyString,
  isNonEmptyArray,
} from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { getEventAttributeValue } from './event.getters';

const { DROP_OFF, EMISSION_AND_COMPOSTING_METRICS, PICK_UP, RULES_METADATA } =
  DocumentEventName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIdDocumentActorType;

export const getLastEmissionAndCompostingMetricsEvent = (
  document: Document,
): DocumentEvent | undefined => {
  const emissionAndCompostingMetricsEvents = document.externalEvents?.filter(
    (event) => event.name.toString().includes(EMISSION_AND_COMPOSTING_METRICS),
  );

  return emissionAndCompostingMetricsEvents
    ?.sort((firstEvent, secondEvent) => {
      const firstReferenceYear = getEventAttributeValue(
        firstEvent,
        DocumentEventAttributeName.REFERENCE_YEAR,
      );

      const numberFirstReferenceYear = Number.parseInt(
        assertNonEmptyString(firstReferenceYear),
      );

      const secondReferenceYear = getEventAttributeValue(
        secondEvent,
        DocumentEventAttributeName.REFERENCE_YEAR,
      );

      const numberSecondReferenceYear = Number.parseInt(
        assertNonEmptyString(secondReferenceYear),
      );

      return numberSecondReferenceYear - numberFirstReferenceYear;
    })
    .at(0);
};

export const getDocumentEventById = (
  document: Document,
  eventId: string,
): DocumentEvent | undefined =>
  document.externalEvents?.find((event) => event.id === eventId);

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
