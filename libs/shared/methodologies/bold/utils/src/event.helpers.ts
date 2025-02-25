import { calculateDistance } from '@carrot-fndn/shared/helpers';
import { type DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

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
