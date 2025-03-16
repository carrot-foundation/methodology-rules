import type {
  DocumentEvent,
  DocumentEventAttribute,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  DocumentEventAttributeName,
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export type MergeEventsMapsParameter =
  | Map<DocumentEventName | string, DocumentEvent | undefined>
  | Partial<Record<string, DocumentEvent | undefined>>
  | undefined;

/**
 * Merges a default events map with an override map, prioritizing the override values.
 * If an event in the override map is undefined, it will be removed from the result.
 *
 * @param defaultEventsMap - The default Map of events to start with
 * @param overrideEventsMap - Optional Map or object containing events that should override the defaults
 * @returns A new Map with the merged events
 */
export function mergeEventsMaps<T extends DocumentEventName | string>(
  defaultEventsMap: Map<T, DocumentEvent>,
  overrideEventsMap?:
    | Map<T, DocumentEvent | undefined>
    | Partial<Record<string, DocumentEvent | undefined>>
    | undefined,
): Map<T, DocumentEvent> {
  const mergedEventsMap = new Map(defaultEventsMap);

  if (!overrideEventsMap) {
    return mergedEventsMap;
  }

  if (overrideEventsMap instanceof Map) {
    for (const [key, value] of overrideEventsMap.entries()) {
      if (value === undefined) {
        mergedEventsMap.delete(key);
      } else {
        mergedEventsMap.set(key, value);
      }
    }
  } else {
    for (const [key, value] of Object.entries(overrideEventsMap)) {
      if (value === undefined) {
        mergedEventsMap.delete(key as T);
      } else {
        mergedEventsMap.set(key as T, value);
      }
    }
  }

  return mergedEventsMap;
}

export type MetadataAttributeTupleParameter = [
  DocumentEventAttributeName | NewDocumentEventAttributeName,
  MethodologyDocumentEventAttributeValue | undefined,
];

export type MetadataAttributeTupleResponse = [
  DocumentEventAttributeName | NewDocumentEventAttributeName,
  MethodologyDocumentEventAttributeValue,
];

export type MetadataAttributeParameter =
  | MetadataAttributeTupleParameter
  | Omit<DocumentEventAttribute, 'isPublic'>;

export type MetadataAttributeResponse =
  | MetadataAttributeTupleResponse
  | Omit<DocumentEventAttribute, 'isPublic'>;

function isTuple(
  attribute: MetadataAttributeParameter,
): attribute is MetadataAttributeTupleParameter {
  return Array.isArray(attribute);
}

function getAttributeName(attribute: MetadataAttributeParameter): string {
  return (isTuple(attribute) ? attribute[0] : attribute.name).toString();
}

/**
 * Merges default metadata attributes with override attributes, prioritizing the override values.
 * If an attribute in the override array has undefined value, it will be removed from the result.
 *
 * @param defaultAttributes - The default array of attributes to start with
 * @param overrideAttributes - Optional array of attributes that should override the defaults
 * @returns A new array with the merged attributes
 */
export function mergeMetadataAttributes(
  defaultAttributes: MetadataAttributeParameter[],
  overrideAttributes?: MetadataAttributeParameter[] | undefined,
): MetadataAttributeResponse[] {
  const filteredDefaults = defaultAttributes.filter((attribute) =>
    isTuple(attribute)
      ? attribute[1] !== undefined
      : attribute.value !== undefined,
  );

  if (!overrideAttributes || overrideAttributes.length === 0) {
    return filteredDefaults as MetadataAttributeResponse[];
  }

  const attributesMap = new Map<string, MetadataAttributeParameter>();

  for (const attribute of filteredDefaults) {
    attributesMap.set(getAttributeName(attribute), attribute);
  }

  for (const attribute of overrideAttributes) {
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
}
