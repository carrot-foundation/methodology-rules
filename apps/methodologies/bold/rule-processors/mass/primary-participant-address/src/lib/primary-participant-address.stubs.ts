import { stubDocumentWithOneActorType } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
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
