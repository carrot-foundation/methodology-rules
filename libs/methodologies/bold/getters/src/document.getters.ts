import {
  type Document,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';

import { getEventAttributeValue } from './event.getters';

const { ACTOR } = DocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;

export const getAuditorActorEvent = (
  document: Document,
): DocumentEvent | undefined =>
  document.externalEvents?.find(
    (event) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      event.name === ACTOR &&
      getEventAttributeValue(event, ACTOR_TYPE) === AUDITOR,
  );

export const getOpenEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) => event.name === DocumentEventName.OPEN.toString(),
  );

export const getRulesMetadataEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) => event.name === DocumentEventName.RULES_METADATA.toString(),
  );
