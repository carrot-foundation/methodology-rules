import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/recycling/organic/getters';
import {
  DataSetName,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  ParticipantType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { CARROT_PARTICIPANT_BY_ENVIRONMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import {
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { validate } from 'typia';

export const eventHasName = (
  event: DocumentEvent,
  eventName: DocumentEventName,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
): boolean => event.name === eventName;

export const isActorEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.ACTOR);

export const isOpenEvent = (event: DocumentEvent): boolean =>
  eventHasName(event, DocumentEventName.OPEN);

export const eventHasActorParticipant = (event: DocumentEvent): boolean =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  event.participant.type === ParticipantType.ACTOR;

export const eventHasSourceActor = (event: DocumentEvent): boolean =>
  getEventAttributeValue(event, DocumentEventAttributeName.ACTOR_TYPE) ===
  DocumentEventActorType.SOURCE;

export const eventHasRecyclerActor = (event: DocumentEvent): boolean =>
  getEventAttributeValue(event, DocumentEventAttributeName.ACTOR_TYPE) ===
  DocumentEventActorType.RECYCLER;

export const eventHasAuditorActor = (event: DocumentEvent): boolean =>
  getEventAttributeValue(event, DocumentEventAttributeName.ACTOR_TYPE) ===
  DocumentEventActorType.AUDITOR;

export const isActorEventWithSourceActorType = (
  event: DocumentEvent,
): boolean => isActorEvent(event) && eventHasSourceActor(event);

export const eventHasNonEmptyStringAttribute = (
  event: DocumentEvent,
  attributeName: DocumentEventAttributeName,
): boolean => isNonEmptyString(getEventAttributeValue(event, attributeName));

export const hasWeightFormat = (
  unparsedWeightValue: string | undefined,
): boolean => {
  const parts = unparsedWeightValue?.split(' ');

  return parts?.length === 2 && !Number.isNaN(parts[0]) && parts[1] === 'KG';
};

export const eventsHasSameMetadataAttributeValue = (
  events: Array<DocumentEvent>,
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
  eventNames?: Array<DocumentEventName>;
  metadataName: DocumentEventAttributeName;
  metadataValues?: unknown;
}): boolean => {
  const { event, eventNames, metadataName, metadataValues } = options;

  const validation = validate<DocumentEvent>(event);

  if (!validation.success) {
    return false;
  }

  const isValidName =
    !isNonEmptyArray(eventNames) ||
    eventNames.some((eventName) => eventHasName(event, eventName));

  const isValidMetadataName =
    !!validation.data.metadata?.attributes &&
    validation.data.metadata.attributes.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
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
