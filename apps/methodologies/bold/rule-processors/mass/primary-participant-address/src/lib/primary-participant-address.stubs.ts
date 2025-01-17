import { stubDocumentWithOneActorType } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type Document,
  DocumentEventActorType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { faker } from '@faker-js/faker';

export const stubDocumentActorEventWithSourceActorTypeAndPrimaryAddress =
  (): Document => {
    const id = faker.string.uuid();

    return stubDocumentWithOneActorType(
      DocumentEventActorType.SOURCE,
      {
        primaryAddress: { id },
      },
      { address: { id } },
    );
  };
