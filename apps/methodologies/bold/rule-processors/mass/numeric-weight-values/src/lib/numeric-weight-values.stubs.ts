import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  MeasurementUnit,
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
          name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
          value: `${faker.number.float()} ${MeasurementUnit.KG}`,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.VEHICLE_WEIGHT,
          value: `${faker.number.float()} ${MeasurementUnit.KG}`,
        },
        {
          isPublic: true,
          name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
          value: `${faker.number.float()} ${MeasurementUnit.KG}`,
        },
      ],
    },
    name: DocumentEventName.MOVE,
  });
