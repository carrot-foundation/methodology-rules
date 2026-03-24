import {
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  type DocumentEventAttributeName,
  type DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import { DataSetName, type NonEmptyString } from '@carrot-fndn/shared/types';

import { validateDocumentEvent } from './event.predicates.validators';

export const eventHasName = (
  event: DocumentEvent,
  eventName: DocumentEventName,
): boolean => event.name === eventName.toString();

export const eventHasLabel = (
  event: DocumentEvent,
  eventLabel: NonEmptyString,
): boolean => event.label === eventLabel;

export const isActorEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, 'ACTOR');

export const isRecycledEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, 'Recycled');

export const eventHasActorParticipant = (event: DocumentEvent): boolean =>
  event.participant.type === 'ACTOR';

export const eventHasNonEmptyStringAttribute = (
  event: DocumentEvent,
  attributeName: DocumentEventAttributeName,
): boolean => isNonEmptyString(getEventAttributeValue(event, attributeName));

export const hasWeightFormat = (
  unparsedWeightValue: string | undefined,
): boolean => {
  const parts = unparsedWeightValue?.split(' ');

  return parts?.length === 2 && !Number.isNaN(parts[0]) && parts[1] === 'kg';
};

export const eventsHasSameMetadataAttributeValue = (
  events: DocumentEvent[],
  metadataName: DocumentEventAttributeName,
): boolean => {
  if (isNonEmptyArray<DocumentEvent>(events)) {
    return events.every(
      (event) =>
        getEventAttributeValue(event, metadataName) ===
        getEventAttributeValue(events[0], metadataName),
    );
  }

  return false;
};

export const eventHasMetadataAttribute = (options: {
  event: DocumentEvent;
  eventNames?: DocumentEventName[];
  metadataName: string;
  metadataValues?: unknown;
}): boolean => {
  const { event, eventNames, metadataName, metadataValues } = options;

  const validation = validateDocumentEvent(event);

  if (!validation.success) {
    return false;
  }

  const isValidName =
    !isNonEmptyArray(eventNames) ||
    eventNames.some((eventName) => eventHasName(event, eventName));

  const isValidMetadataName =
    !!validation.data.metadata?.attributes &&
    validation.data.metadata.attributes.some(
      (attribute) => attribute.name === metadataName,
    );

  const isValidValue =
    isNil(metadataValues) ||
    (Array.isArray(metadataValues)
      ? metadataValues
      : [metadataValues]
    ).includes(getEventAttributeValue(event, metadataName));

  return isValidMetadataName && isValidName && isValidValue;
};

export const eventHasCarrotParticipant = (
  event: DocumentEvent,
  dataSetName: DataSetName,
): boolean => {
  const development =
    CARROT_PARTICIPANT_BY_ENVIRONMENT.development[dataSetName];
  const production = CARROT_PARTICIPANT_BY_ENVIRONMENT.production[dataSetName];

  return (
    event.participant.id === development.id ||
    event.participant.id === production.id
  );
};
