import {
  stubDocumentEventWithMetadata,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  type DocumentEvent,
  type DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { faker } from '@faker-js/faker';

import { REQUIRED_ACTOR_TYPES } from './rewards-distribution.constants';

const getActorTypeMetadata = (
  actorType: DocumentEventActorType,
): DocumentEvent => ({
  ...stubDocumentEventWithMetadata([
    {
      isPublic: faker.datatype.boolean(),
      name: DocumentEventAttributeName.ACTOR_TYPE,
      value: String(actorType),
    },
  ]),
  name: DocumentEventName.ACTOR,
});

export const requiredMassActorEvents = REQUIRED_ACTOR_TYPES.MASS.map(
  (actorType) => getActorTypeMetadata(actorType),
);
export const requiredMethodologyActorsEvents =
  REQUIRED_ACTOR_TYPES.METHODOLOGY.map((actorType) =>
    getActorTypeMetadata(actorType),
  );

export const stubMassDocumentWithRequiredActors = (
  partialDocument?: Partial<Document>,
) =>
  stubMassDocument({
    ...partialDocument,
    externalEvents: [
      ...(partialDocument?.externalEvents ?? []),
      ...requiredMassActorEvents,
    ],
  });

export const stubMethodologyWithRequiredActors = (
  partialDocument?: Partial<Document>,
) =>
  stubMethodologyDefinitionDocument({
    ...partialDocument,
    externalEvents: [
      ...(partialDocument?.externalEvents ?? []),
      ...requiredMethodologyActorsEvents,
    ],
  });
