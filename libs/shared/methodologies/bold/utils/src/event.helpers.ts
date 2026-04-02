import { calculateDistance } from '@carrot-fndn/shared/helpers';
import { type BoldDocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

export const calculateDistanceBetweenTwoEvents = (
  eventA: BoldDocumentEvent,
  eventB: BoldDocumentEvent,
): number =>
  calculateDistance(
    {
      latitude: eventA.address.latitude,
      longitude: eventA.address.longitude,
    },
    {
      latitude: eventB.address.latitude,
      longitude: eventB.address.longitude,
    },
  );
