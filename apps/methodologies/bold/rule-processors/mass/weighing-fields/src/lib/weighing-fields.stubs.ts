import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';
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
    name: MethodologyDocumentEventName.MOVE,
  });
