import type {
  DocumentEvent,
  DocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { DocumentEventAttributeName } from '@carrot-fndn/shared/methodologies/bold/types';

import { EXPLICIT_ATTRIBUTES } from '../stubs/document-event.stubs';

export type MergeEventsMapsParameter =
  | Map<string, DocumentEvent | undefined>
  | Record<string, DocumentEvent | undefined>
  | undefined;

/**
 * Merges a default events map with an override map, prioritizing the override values.
 * If an event in the override map is undefined, it will be removed from the result.
 *
 * @param defaultEventsMap - The default Map of events to start with
 * @param overridenEventsMap - Optional Map or object containing events that should override the defaults
 * @returns A new Map with the merged events
 */
export const mergeEventsMaps = <T extends string>(
  defaultEventsMap: Map<T, DocumentEvent>,
  overridenEventsMap:
    | Map<T, DocumentEvent | undefined>
    | Record<string, DocumentEvent | undefined>,
): Map<T, DocumentEvent> => {
  const mergedEventsMap = new Map(defaultEventsMap);

  if (overridenEventsMap instanceof Map) {
    for (const [key, value] of overridenEventsMap.entries()) {
      if (value === undefined) {
        mergedEventsMap.delete(key);
      } else {
        mergedEventsMap.set(key, value);
      }
    }
  } else {
    for (const [key, value] of Object.entries(overridenEventsMap)) {
      if (value === undefined) {
        mergedEventsMap.delete(key as T);
      } else {
        mergedEventsMap.set(key as T, value);
      }
    }
  }

  return mergedEventsMap;
};

export type MetadataAttributeParameter =
  | MetadataAttributeTupleParameter
  | Omit<DocumentEventAttribute, 'isPublic'>;

export type MetadataAttributeResponse =
  | MetadataAttributeTupleResponse
  | Omit<DocumentEventAttribute, 'isPublic'>;

export type MetadataAttributeTupleParameter = [
  DocumentEventAttributeName,
  MethodologyDocumentEventAttributeValue | undefined,
];

export type MetadataAttributeTupleResponse = [
  DocumentEventAttributeName,
  MethodologyDocumentEventAttributeValue,
];

/**
 * Attaches the list of explicitly-provided metadata attribute names to a
 * DocumentEvent.  Used by the manifest generator to filter out default
 * (noise) attributes from examples.
 */
export const attachExplicitAttributes = (
  event: DocumentEvent,
  metadataAttributes?: MetadataAttributeParameter[],
): DocumentEvent => {
  if (metadataAttributes !== undefined && metadataAttributes.length > 0) {
    Object.defineProperty(event, EXPLICIT_ATTRIBUTES, {
      configurable: true,
      enumerable: false,
      value: metadataAttributes.map((attribute) => getAttributeName(attribute)),
    });
  }

  return event;
};

export const isTuple = (
  attribute: MetadataAttributeParameter,
): attribute is MetadataAttributeTupleParameter => Array.isArray(attribute);

export const getAttributeName = (
  attribute: MetadataAttributeParameter,
): string => (isTuple(attribute) ? attribute[0] : attribute.name).toString();

/**
 * Merges default metadata attributes with override attributes, prioritizing the override values.
 * If an attribute in the override array has undefined value, it will be removed from the result.
 *
 * @param defaultAttributes - The default array of attributes to start with
 * @param overridenAttributes - Optional array of attributes that should override the defaults
 * @returns A new array with the merged attributes
 */
export const mergeMetadataAttributes = (
  defaultAttributes: MetadataAttributeParameter[],
  overridenAttributes?: MetadataAttributeParameter[],
): MetadataAttributeResponse[] => {
  const filteredDefaults = defaultAttributes.filter((attribute) =>
    isTuple(attribute)
      ? attribute[1] !== undefined
      : attribute.value !== undefined,
  );

  if (overridenAttributes === undefined) {
    return filteredDefaults as MetadataAttributeResponse[];
  }

  if (overridenAttributes.length === 0) {
    return [];
  }

  const attributesMap = new Map<string, MetadataAttributeParameter>();

  for (const attribute of filteredDefaults) {
    attributesMap.set(getAttributeName(attribute), attribute);
  }

  for (const attribute of overridenAttributes) {
    const name = getAttributeName(attribute);

    const hasValue = isTuple(attribute)
      ? attribute[1] !== undefined
      : attribute.value !== undefined;

    if (hasValue) {
      attributesMap.set(name, attribute);
    } else {
      attributesMap.delete(name);
    }
  }

  return [...attributesMap.values()] as MetadataAttributeResponse[];
};
