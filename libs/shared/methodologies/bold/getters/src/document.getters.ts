import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  type DocumentEvent,
  type MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonZeroPositiveInt } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from './event.getters';

interface LastYearEmissionAndCompostingMetricsEventParameters {
  documentWithEmissionAndCompostingMetricsEvent: Document;
  documentYear: NonZeroPositiveInt;
}

export const getLastYearEmissionAndCompostingMetricsEvent = ({
  documentWithEmissionAndCompostingMetricsEvent,
  documentYear,
}: LastYearEmissionAndCompostingMetricsEventParameters):
  | DocumentEvent
  | undefined => {
  const lastDocumentYearYear = documentYear - 1;

  return documentWithEmissionAndCompostingMetricsEvent.externalEvents?.find(
    (event) => {
      if (event.name.toString().includes('Emissions & Composting Metrics')) {
        const referenceYear = getEventAttributeValue(event, 'Reference Year');

        return referenceYear?.toString() === lastDocumentYearYear.toString();
      }

      return false;
    },
  );
};

export const getDocumentEventById = (
  document: Document,
  eventId: string,
): DocumentEvent | undefined =>
  document.externalEvents?.find((event) => event.id === eventId);

export const getRulesMetadataEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find((event) => event.name === 'RULES METADATA');

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

  const pickUpEvents = events.filter((e) => e.name === 'Pick-up');
  const dropOffEvents = events.filter((e) => e.name === 'Drop-off');

  if (!isNonEmptyArray(pickUpEvents) || !isNonEmptyArray(dropOffEvents)) {
    return undefined;
  }

  const sourcePickUp = pickUpEvents[0] as DocumentEvent;
  const finalDropOff = dropOffEvents.at(-1) as DocumentEvent;

  if (sourcePickUp.id === event.id) {
    return 'Waste Generator';
  }

  if (finalDropOff.id === event.id) {
    return 'Recycler';
  }

  if (event.name === 'Pick-up' || event.name === 'Drop-off') {
    return 'Processor';
  }

  return undefined;
};
