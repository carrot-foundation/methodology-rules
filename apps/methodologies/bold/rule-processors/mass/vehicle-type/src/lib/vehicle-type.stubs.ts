import type { PartialDeep } from 'type-fest';

import { stubDocumentEventWithMetadataAttributes } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { random } from 'typia';

const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

export const stubEventWithVehicleType = (
  vehicleType: string,
  partialEvent?: PartialDeep<DocumentEvent>,
): DocumentEvent =>
  stubDocumentEventWithMetadataAttributes(partialEvent, [
    [
      DocumentEventAttributeName.MOVE_TYPE,
      random<typeof PICK_UP | typeof SHIPMENT_REQUEST>(),
    ],
    [DocumentEventAttributeName.VEHICLE_TYPE, vehicleType],
  ]);
