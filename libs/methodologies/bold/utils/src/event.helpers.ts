import { type DocumentEvent } from '@carrot-fndn/methodologies/bold/types';
import { calculateDistance } from '@carrot-fndn/shared/helpers';

export const calculateDistanceBetweenTwoEvents = (
  eventA: DocumentEvent,
  eventB: DocumentEvent,
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
