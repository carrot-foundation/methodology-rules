import type { MassIDConnectionEvidence } from '@carrot-fndn/shared/methodologies/bold/types';

import { faker } from '@faker-js/faker';

export const stubMassIDConnectionEvidence = (
  partialEvidence: Partial<MassIDConnectionEvidence> = {},
): MassIDConnectionEvidence => ({
  documentId: faker.string.uuid(),
  dropOffDate: faker.date.recent().toISOString(),
  generatorPalantirParticipantId: faker.string.uuid(),
  massId: faker.string.uuid(),
  policyVersion: faker.system.semver(),
  preparedAt: faker.date.recent().toISOString(),
  snapshotVersion: faker.date.recent().toISOString(),
  version: 1,
  wasteManagers: [],
  ...partialEvidence,
});
