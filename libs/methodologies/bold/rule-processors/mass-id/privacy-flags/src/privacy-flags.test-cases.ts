import type { BoldDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

import {
  stubDocumentEvent,
  stubDocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldActorType,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { EVENT_PRIVACY_SPEC } from './privacy-flags.constants';

const { ACTOR } = BoldDocumentEventName;
const { HAULER, PROCESSOR, RECYCLER, WASTE_GENERATOR } = BoldActorType;

export const SPECIFIED_EVENT_NAMES = [...EVENT_PRIVACY_SPEC.keys()];

export const ASSERTABLE_ACTOR_LABELS = [
  HAULER,
  PROCESSOR,
  RECYCLER,
  WASTE_GENERATOR,
];

export const actorEventKey = (label: string): string => `${ACTOR}-${label}`;

export const conformantEvent = (eventName: string): BoldDocumentEvent => {
  const eventSpec = EVENT_PRIVACY_SPEC.get(eventName);

  return stubDocumentEvent({
    isPublic: true,
    metadata: {
      attributes: [...(eventSpec?.attributes ?? [])].map(
        ([attributeName, attributeSpec]) =>
          stubDocumentEventAttribute({
            isPublic: attributeSpec.isPublic,
            name: attributeName,
            sensitive: attributeSpec.sensitive,
          }),
      ),
    },
    name: eventName,
  });
};

export const conformantActorEvent = (label: string): BoldDocumentEvent =>
  stubDocumentEvent({
    isPublic: true,
    label,
    name: ACTOR,
    preserveSensitiveData: false,
  });

export const conformantExternalEventsMap = (): Record<
  string,
  BoldDocumentEvent
> => ({
  ...Object.fromEntries(
    SPECIFIED_EVENT_NAMES.map((eventName) => [
      eventName,
      conformantEvent(eventName),
    ]),
  ),
  ...Object.fromEntries(
    ASSERTABLE_ACTOR_LABELS.map((label) => [
      actorEventKey(label),
      conformantActorEvent(label),
    ]),
  ),
});
