import {
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type BoldDocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  DataSetName,
  type NonEmptyString,
  ParticipantType,
} from '@carrot-fndn/shared/types';

import { validateDocumentEvent } from './event.predicates.validators';

export const eventHasName = (
  event: BoldDocumentEvent,
  eventName: DocumentEventName,
): boolean => event.name === eventName.toString();

export const eventHasLabel = (
  event: BoldDocumentEvent,
  eventLabel: NonEmptyString,
): boolean => event.label === eventLabel;

export const isActorEvent = (event: BoldDocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.ACTOR);

export const isRecycledEvent = (event: BoldDocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.RECYCLED);

export const eventHasActorParticipant = (event: BoldDocumentEvent): boolean =>
  event.participant.type === ParticipantType.ACTOR.toString();

export const eventHasNonEmptyStringAttribute = (
  event: BoldDocumentEvent,
  attributeName: DocumentEventAttributeName,
): boolean => isNonEmptyString(getEventAttributeValue(event, attributeName));

export const hasWeightFormat = (
  unparsedWeightValue: string | undefined,
): boolean => {
  const parts = unparsedWeightValue?.split(' ');

  return (
    parts?.length === 2 &&
    !Number.isNaN(parts[0]) &&
    parts[1] === MeasurementUnit.KG
  );
};

export const eventsHasSameMetadataAttributeValue = (
  events: BoldDocumentEvent[],
  metadataName: DocumentEventAttributeName,
): boolean => {
  if (isNonEmptyArray<BoldDocumentEvent>(events)) {
    return events.every(
      (event) =>
        getEventAttributeValue(event, metadataName) ===
        getEventAttributeValue(events[0], metadataName),
    );
  }

  return false;
};

export const eventHasMetadataAttribute = (options: {
  event: BoldDocumentEvent;
  eventNames?: DocumentEventName[];
  metadataName: DocumentEventAttributeName | string;
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
  event: BoldDocumentEvent,
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
