import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';

const VEHICLE_GROSS_WEIGHT = faker.number.float({
  fractionDigits: 3,
  max: 5000,
  min: 300,
});
const VEHICLE_WEIGHT = faker.number.float({
  fractionDigits: 3,
  max: VEHICLE_GROSS_WEIGHT,
  min: 300,
});
const LOAD_NET_WEIGHT = new BigNumber(VEHICLE_GROSS_WEIGHT).minus(
  VEHICLE_WEIGHT,
);

export const APPROVED_WEIGHING_MOVE_EVENT_ATTRIBUTES = [
  {
    isPublic: true,
    name: DocumentEventAttributeName.MOVE_TYPE,
    value: DocumentEventMoveType.WEIGHING,
  },
  {
    isPublic: true,
    name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
    value: `${VEHICLE_GROSS_WEIGHT} KG`,
  },
  {
    isPublic: true,
    name: DocumentEventAttributeName.VEHICLE_WEIGHT,
    value: `${VEHICLE_WEIGHT} KG`,
  },

  {
    isPublic: true,
    name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
    value: `${LOAD_NET_WEIGHT.toString()} KG`,
  },
];

export const stubApprovedWeighingMoveEvent = (
  partialEvent?: PartialDeep<DocumentEvent>,
): DocumentEvent =>
  stubDocumentEvent({
    ...partialEvent,
    metadata: {
      attributes: APPROVED_WEIGHING_MOVE_EVENT_ATTRIBUTES,
    },
    name: DocumentEventName.MOVE,
  });
