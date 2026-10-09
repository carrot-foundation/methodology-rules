import type {
  MassIDConfirmedConnectionEntry,
  MassIDConnectionEvidence,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { faker } from '@faker-js/faker';
import { format } from 'date-fns';

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

export const stubMassIDConfirmedConnectionEntry = (
  partialEntry: Partial<MassIDConfirmedConnectionEntry> = {},
): MassIDConfirmedConnectionEntry => ({
  confirmedStartDate: format(faker.date.past(), 'yyyy-MM-dd'),
  eligibility: 'eligible',
  palantirParticipantId: faker.string.uuid(),
  relationId: faker.string.uuid(),
  revision: faker.number.int({ max: 10, min: 0 }),
  source: 'both',
  ...partialEntry,
});
