import type { UnknownArray } from 'type-fest';

import {
  BoldAttributeName,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type NonEmptyString,
  type PredicateCallback,
} from '@carrot-fndn/shared/types';

import {
  eventHasLabel,
  eventHasMetadataAttribute,
  eventHasName,
  eventHasNonEmptyStringAttribute,
} from './event.predicates';

export const and =
  <T>(
    ...predicateCallbacks: [
      PredicateCallback<T>,
      PredicateCallback<T>,
      ...Array<PredicateCallback<T>>,
    ]
  ): PredicateCallback<T> =>
  (input: T) =>
    predicateCallbacks.every((predicateCallback) => predicateCallback(input));

export const not =
  <T>(predicateCallback: PredicateCallback<T>) =>
  (input: T) =>
    !predicateCallback(input);

export const eventNameIsAnyOf =
  (eventNames: BoldDocumentEventName[]): PredicateCallback<BoldDocumentEvent> =>
  (event) =>
    eventNames.some((name) => eventHasName(event, name));

export const eventLabelIsAnyOf =
  (eventLabels: NonEmptyString[]): PredicateCallback<BoldDocumentEvent> =>
  (event) =>
    eventLabels.some((label) => eventHasLabel(event, label));

export const metadataAttributeNameIsAnyOf =
  (metadataNames: BoldAttributeName[]): PredicateCallback<BoldDocumentEvent> =>
  (event) =>
    metadataNames.some((metadataName) =>
      eventHasMetadataAttribute({ event, metadataName }),
    );

export const metadataAttributeValueIsAnyOf =
  (
    metadataName: BoldAttributeName,
    metadataValues: UnknownArray,
  ): PredicateCallback<BoldDocumentEvent> =>
  (event) =>
    eventHasMetadataAttribute({ event, metadataName, metadataValues });

export const metadataAttributeValueIsNotEmpty =
  (metadataName: BoldAttributeName): PredicateCallback<BoldDocumentEvent> =>
  (event) =>
    eventHasNonEmptyStringAttribute(event, metadataName);
