import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
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
          name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
          value: `${faker.number.float()} KG`,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.VEHICLE_WEIGHT,
          value: `${faker.number.float()} KG`,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
          value: `${faker.number.float()} KG`,
        },
      ],
    },
    name: DocumentEventName.MOVE,
  });
