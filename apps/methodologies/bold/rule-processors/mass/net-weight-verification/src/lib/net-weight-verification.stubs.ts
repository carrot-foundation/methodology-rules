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

export const stubApprovedWeighingMoveEventAttributes = (
  weightDifference = 0,
) => {
  const loadNetWeight = new BigNumber(VEHICLE_GROSS_WEIGHT)
    .minus(VEHICLE_WEIGHT)
    .minus(weightDifference);

  return [
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
      value: `${loadNetWeight.toString()} KG`,
    },
  ];
};

export const stubApprovedWeighingMoveEvent = (
  partialEvent?: PartialDeep<DocumentEvent>,
  weightDifference?: number,
): DocumentEvent =>
  stubDocumentEvent({
    ...partialEvent,
    metadata: {
      attributes: stubApprovedWeighingMoveEventAttributes(weightDifference),
    },
    name: DocumentEventName.MOVE,
  });
