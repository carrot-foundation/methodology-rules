import type { UnknownArray } from 'type-fest';

import {
  type DocumentEvent,
  DocumentEventName,
  NewDocumentEventAttributeName,
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
      ...PredicateCallback<T>[],
    ]
  ): PredicateCallback<T> =>
  (input: T) =>
    predicateCallbacks.every((predicateCallback) => predicateCallback(input));

export const not =
  <T>(predicateCallback: PredicateCallback<T>) =>
  (input: T) =>
    !predicateCallback(input);

export const eventNameIsAnyOf =
  (eventNames: Array<DocumentEventName>): PredicateCallback<DocumentEvent> =>
  (event) =>
    eventNames.some((name) => eventHasName(event, name));

export const eventLabelIsAnyOf =
  (eventLabels: Array<NonEmptyString>): PredicateCallback<DocumentEvent> =>
  (event) =>
    eventLabels.some((label) => eventHasLabel(event, label));

export const metadataAttributeNameIsAnyOf =
  (
    metadataNames: Array<NewDocumentEventAttributeName>,
  ): PredicateCallback<DocumentEvent> =>
  (event) =>
    metadataNames.some((metadataName) =>
      eventHasMetadataAttribute({ event, metadataName }),
    );

export const metadataAttributeValueIsAnyOf =
  (
    metadataName: NewDocumentEventAttributeName,
    metadataValues: UnknownArray,
  ): PredicateCallback<DocumentEvent> =>
  (event) =>
    eventHasMetadataAttribute({ event, metadataName, metadataValues });

export const metadataAttributeValueIsNotEmpty =
  (
    metadataName: NewDocumentEventAttributeName,
  ): PredicateCallback<DocumentEvent> =>
  (event) =>
    eventHasNonEmptyStringAttribute(event, metadataName);
