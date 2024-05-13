import type { GeolibInputCoordinates } from 'geolib/es/types';

import { convertDistance, getDistance } from 'geolib';

export const calculateDistance = (
  coordinateA: GeolibInputCoordinates,
  coordinateB: GeolibInputCoordinates,
): number => {
  const distanceInMeters = getDistance(coordinateA, coordinateB);

  return convertDistance(distanceInMeters, 'km');
};
