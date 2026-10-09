import { faker } from '@faker-js/faker';

import {
  type MassIDConfirmedConnectionEntry,
  type MassIDConnectionEvidence,
  MassIDConnectionEvidenceSchema,
  type MassIDConnectionEvidenceWasteManager,
} from './connection-evidence.types';

const stubMassIDConnectionEvidence = (
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

const stubConfirmedEntry = (
  partialEntry: Partial<MassIDConfirmedConnectionEntry> = {},
): MassIDConfirmedConnectionEntry => ({
  confirmedStartDate: '2026-10-01',
  eligibility: 'eligible',
  palantirParticipantId: faker.string.uuid(),
  relationId: faker.string.uuid(),
  revision: 1,
  source: 'both',
  ...partialEntry,
});

describe('MassIDConnectionEvidenceSchema', () => {
  it('should accept evidence with integrator, connection and both entries', () => {
    const evidence = stubMassIDConnectionEvidence({
      wasteManagers: [
        {
          eligibility: 'review',
          palantirParticipantId: faker.string.uuid(),
          reason: 'no-confirmed-connection',
          source: 'integrator',
        },
        stubConfirmedEntry({ source: 'connection' }),
        stubConfirmedEntry({ source: 'both' }),
      ],
    });

    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      true,
    );
  });

  it('should accept null generator and Drop-off when there is no confirmed connection', () => {
    const evidence = stubMassIDConnectionEvidence({
      dropOffDate: null,
      generatorPalantirParticipantId: null,
    });

    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      true,
    );
  });

  it.each([
    {
      evidence: { ...stubMassIDConnectionEvidence(), version: 2 },
      scenario: 'an unknown version',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({ palantirParticipantId: 'participant-1' }),
          stubConfirmedEntry({ palantirParticipantId: 'participant-1' }),
        ],
      }),
      scenario: 'a repeated palantirParticipantId',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          {
            eligibility: 'eligible',
            palantirParticipantId: faker.string.uuid(),
            source: 'integrator',
          } as unknown as MassIDConnectionEvidenceWasteManager,
        ],
      }),
      scenario: 'an eligible integrator entry',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          { ...stubConfirmedEntry(), relationId: undefined },
        ] as unknown as MassIDConnectionEvidenceWasteManager[],
      }),
      scenario: 'a connection entry without relationId',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({ confirmedStartDate: '01/10/2026' }),
        ],
      }),
      scenario: 'a confirmedStartDate that is not an ISO date',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        generatorPalantirParticipantId: null,
        wasteManagers: [stubConfirmedEntry({ source: 'connection' })],
      }),
      scenario: 'a confirmed connection without generator',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({
            eligibility: 'ineligible',
            reason: 'Connection started after the drop-off',
          }),
        ],
      }),
      scenario: 'a prose reason',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({ eligibility: 'review', reason: 'policy--gap' }),
        ],
      }),
      scenario: 'a reason with an empty kebab segment',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({ eligibility: 'review', reason: 'a'.repeat(65) }),
        ],
      }),
      scenario: 'a reason longer than 64 characters',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          {
            eligibility: 'review',
            palantirParticipantId: faker.string.uuid(),
            relationId: faker.string.uuid(),
            source: 'integrator',
          } as unknown as MassIDConnectionEvidenceWasteManager,
        ],
      }),
      scenario: 'an integrator entry carrying connection fields',
    },
    {
      evidence: { ...stubMassIDConnectionEvidence(), generatorName: 'Pedro' },
      scenario: 'a field outside the contract',
    },
  ])('should reject $scenario', ({ evidence }) => {
    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      false,
    );
  });
});
