import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { faker } from '@faker-js/faker';
import BigNumber from 'bignumber.js';

export const stubApprovedWeighingMoveEventAttributes = (
  fixedWeights = false,
  weightDifference = 0,
) => {
  const vehicleGrossWeight = new BigNumber(
    fixedWeights
      ? '128901.00'
      : faker.number.float({
          fractionDigits: 3,
          max: 5000,
          min: 300,
        }),
  );

  const vehicleWeight = new BigNumber(
    fixedWeights
      ? '19700.00'
      : faker.number.float({
          fractionDigits: 3,
          max: vehicleGrossWeight.toNumber(),
          min: 300,
        }),
  );

  const loadNetWeight = vehicleGrossWeight
    .minus(vehicleWeight)
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
      value: `${vehicleGrossWeight.toString()} KG`,
    },
    {
      isPublic: true,
      name: DocumentEventAttributeName.VEHICLE_WEIGHT,
      value: `${vehicleWeight.toString()} KG`,
    },
    {
      isPublic: true,
      name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
      value: `${loadNetWeight.toString()} KG`,
    },
  ];
};

export const stubApprovedWeighingMoveEvent = (
  options: {
    fixedWeights?: boolean;
    partialEvent?: PartialDeep<DocumentEvent>;
    weightDifference?: number;
  } = {},
): DocumentEvent =>
  stubDocumentEvent({
    ...options.partialEvent,
    metadata: {
      attributes: stubApprovedWeighingMoveEventAttributes(
        options.fixedWeights,
        options.weightDifference,
      ),
    },
    name: DocumentEventName.MOVE,
  });
