import {
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  MeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  DataSetName,
  MethodologyParticipantType,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

import { validateDocumentEvent } from './event.predicates.typia';

export const eventHasName = (
  event: DocumentEvent,
  eventName: DocumentEventName,
): boolean => event.name === eventName.toString();

export const eventHasLabel = (
  event: DocumentEvent,
  eventLabel: NonEmptyString,
): boolean => event.label === eventLabel;

export const isActorEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.ACTOR);

export const isRecycledEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.RECYCLED);

export const eventHasActorParticipant = (event: DocumentEvent): boolean =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  event.participant.type === MethodologyParticipantType.ACTOR;

export const eventHasNonEmptyStringAttribute = (
  event: DocumentEvent,
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
  event: DocumentEvent,
  dataSetName: DataSetName,
): boolean =>
  event.participant.id ===
    CARROT_PARTICIPANT_BY_ENVIRONMENT.development[dataSetName].id ||
  event.participant.id ===
    CARROT_PARTICIPANT_BY_ENVIRONMENT.production[dataSetName].id;
