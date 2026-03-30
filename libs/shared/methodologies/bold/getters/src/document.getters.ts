import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonZeroPositiveInt } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from './event.getters';

const { DROP_OFF, EMISSION_AND_COMPOSTING_METRICS, PICK_UP, RULES_METADATA } =
  DocumentEventName;
const { PROCESSOR, RECYCLER, WASTE_GENERATOR } = MassIDDocumentActorType;

interface LastYearEmissionAndCompostingMetricsEventParameters {
  documentWithEmissionAndCompostingMetricsEvent: BoldDocument;
  documentYear: NonZeroPositiveInt;
}

export const getLastYearEmissionAndCompostingMetricsEvent = ({
  documentWithEmissionAndCompostingMetricsEvent,
  documentYear,
}: LastYearEmissionAndCompostingMetricsEventParameters):
  | BoldDocumentEvent
  | undefined => {
  const lastDocumentYearYear = documentYear - 1;

  return documentWithEmissionAndCompostingMetricsEvent.externalEvents?.find(
    (event) => {
      if (event.name.toString().includes(EMISSION_AND_COMPOSTING_METRICS)) {
        const referenceYear = getEventAttributeValue(
          event,
          DocumentEventAttributeName.REFERENCE_YEAR,
        );

        return referenceYear?.toString() === lastDocumentYearYear.toString();
      }

      return false;
    },
  );
};

export const getDocumentEventById = (
  document: BoldDocument,
  eventId: string,
): BoldDocumentEvent | undefined =>
  document.externalEvents?.find((event) => event.id === eventId);

export const getRulesMetadataEvent = (
  document: BoldDocument | undefined,
): BoldDocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) => event.name === RULES_METADATA.toString(),
  );

export const getParticipantActorType = ({
  document,
  event,
}: {
  document: BoldDocument;
  event: BoldDocumentEvent;
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

  const sourcePickUp = pickUpEvents[0] as BoldDocumentEvent;
  const finalDropOff = dropOffEvents.at(-1) as BoldDocumentEvent;

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
