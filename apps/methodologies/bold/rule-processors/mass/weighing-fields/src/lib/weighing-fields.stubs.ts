import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { faker } from '@faker-js/faker';

export const stubWeighingMoveEvent = (
  partialEvent?: PartialDeep<DocumentEvent>,
): DocumentEvent =>
  stubDocumentEvent({
    ...partialEvent,
    metadata: {
      attributes: [
        {
          isPublic: true,
          name: DocumentEventAttributeName.MOVE_TYPE,
          value: DocumentEventMoveType.WEIGHING,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.WEIGHT_SCALE_TYPE,
          value: faker.string.sample(),
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.WEIGHT_SCALE_MANUFACTURER,
          value: faker.string.sample(),
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.WEIGHT_SCALE_MODEL,
          value: faker.string.numeric(),
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.WEIGHT_SCALE_SOFTWARE,
          value: faker.string.sample(),
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.WEIGHT_SCALE_SUPPLIER,
          value: faker.string.sample(),
        },
      ],
    },
    name: DocumentEventName.MOVE,
  });
