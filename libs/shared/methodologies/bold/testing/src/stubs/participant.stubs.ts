import type {
  MethodologyAuthor,
  MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import { stubEnumValue } from '@carrot-fndn/shared/testing';
import {
  DataSetName,
  MethodologyParticipantType,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

export const stubParticipant = (
  partialParticipant?: PartialDeep<MethodologyParticipant>,
): MethodologyParticipant => ({
  countryCode: faker.location.countryCode(),
  id: faker.string.uuid(),
  name: faker.company.name(),
  piiSnapshotId: faker.string.uuid(),
  taxId: faker.string.numeric(14),
  taxIdType: faker.helpers.arrayElement(['CPF', 'CNPJ']),
  type: stubEnumValue(MethodologyParticipantType),
  ...partialParticipant,
});

export const stubAuthor = (
  partialAuthor?: PartialDeep<MethodologyAuthor>,
): MethodologyAuthor => ({
  clientId: faker.string.uuid(),
  dataSetName: stubEnumValue(DataSetName),
  participantId: faker.string.uuid(),
  ...partialAuthor,
});
