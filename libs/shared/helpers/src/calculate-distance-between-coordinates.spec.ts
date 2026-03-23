import { faker } from '@faker-js/faker';
import { convertDistance, getDistance } from 'geolib';

import { calculateDistance } from './calculate-distance-between-coordinates';

vi.mock('geolib');

describe('calculateDistance', () => {
  const getDistanceMocked = vi.mocked(getDistance);
  const convertDistanceMocked = vi.mocked(convertDistance);

  it('should call getDistance with the correct parameters and return the result', () => {
    const coordinateA = {
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
    };
    const coordinateB = {
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
    };

    const returnValue = faker.number.int();

    getDistanceMocked.mockReturnValueOnce(returnValue);

    const distanceInMeters = calculateDistance(coordinateA, coordinateB);

    const distanceInKms = convertDistanceMocked(distanceInMeters, 'km');

    expect(getDistanceMocked).toHaveBeenCalledWith(coordinateA, coordinateB);
    expect(distanceInKms).toBe(convertDistance(returnValue, 'km'));
  });
});
