import {
  type Document,
  type DocumentEvent,
  DocumentEventActorType,
  DocumentEventAttributeName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from './event.getters';

const { ACTOR } = MethodologyDocumentEventName;
const { AUDITOR } = DocumentEventActorType;
const { ACTOR_TYPE } = DocumentEventAttributeName;

export const getAuditorActorEvent = (
  document: Document,
): DocumentEvent | undefined =>
  document.externalEvents?.find(
    (event) =>
      event.name === ACTOR.toString() &&
      getEventAttributeValue(event, ACTOR_TYPE) === AUDITOR,
  );

export const getOpenEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) => event.name === MethodologyDocumentEventName.OPEN.toString(),
  );

export const getRulesMetadataEvent = (
  document: Document | undefined,
): DocumentEvent | undefined =>
  document?.externalEvents?.find(
    (event) =>
      event.name === MethodologyDocumentEventName.RULES_METADATA.toString(),
  );
