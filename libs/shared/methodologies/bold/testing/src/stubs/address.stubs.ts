import type { DocumentAddress } from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import { faker } from '@faker-js/faker';

export const stubAddress = (
  partialAddress: PartialDeep<DocumentAddress> = {},
): DocumentAddress => ({
  city: faker.location.city(),
  countryCode: faker.location.countryCode(),
  countryState: faker.location.state(),
  id: faker.string.uuid(),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  neighborhood: faker.location.county(),
  number: faker.location.buildingNumber(),
  participantId: faker.string.uuid(),
  piiSnapshotId: faker.string.uuid(),
  street: faker.location.street(),
  zipCode: faker.location.zipCode(),
  ...partialAddress,
});
