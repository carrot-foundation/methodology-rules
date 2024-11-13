import type { PartialDeep } from 'type-fest';

import { stubDocumentEvent } from '@carrot-fndn/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';

export const APPROVED_WEIGHING_MOVE_EVENT_ATTRIBUTES = [
  {
    isPublic: true,
    name: DocumentEventAttributeName.MOVE_TYPE,
    value: DocumentEventMoveType.WEIGHING,
  },
  {
    isPublic: true,
    name: DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
    value: '128901.00 KG',
  },
  {
    isPublic: true,
    name: DocumentEventAttributeName.VEHICLE_WEIGHT,
    value: '19700.00 KG',
  },

  {
    isPublic: true,
    name: DocumentEventAttributeName.LOAD_NET_WEIGHT,
    value: '109201.00 KG',
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
