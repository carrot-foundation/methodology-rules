import { stubDocumentWithOneActorType } from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
} from '@carrot-fndn/methodologies/bold/types';
import { faker } from '@faker-js/faker';

export const stubDocumentActorEventWithSourceActorTypeAndPrimaryParticipant =
  (): Document => {
    const id = faker.string.uuid();

    return stubDocumentWithOneActorType(
      DocumentEventActorType.SOURCE,
      {
        primaryParticipant: { id },
      },
      { participant: { id } },
    );
  };
