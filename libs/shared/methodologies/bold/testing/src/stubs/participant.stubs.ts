import type {
  DocumentAuthor,
  DocumentParticipant,
} from '@carrot-fndn/shared/types';
import type { PartialDeep } from 'type-fest';

import { BoldParticipantType } from '@carrot-fndn/shared/methodologies/bold/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { DataSetName } from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

export const stubParticipant = (
  partialParticipant?: PartialDeep<DocumentParticipant>,
): DocumentParticipant => ({
  countryCode: faker.location.countryCode(),
  id: faker.string.uuid(),
  name: faker.company.name(),
  piiSnapshotId: faker.string.uuid(),
  taxId: faker.string.numeric(14),
  taxIdType: faker.helpers.arrayElement(['CPF', 'CNPJ']),
  type: stubEnumValue(BoldParticipantType),
  ...partialParticipant,
});

export const stubAuthor = (
  partialAuthor?: PartialDeep<DocumentAuthor>,
): DocumentAuthor => ({
  clientId: faker.string.uuid(),
  dataSetName: stubEnumValue(DataSetName),
  participantId: faker.string.uuid(),
  ...partialAuthor,
});
