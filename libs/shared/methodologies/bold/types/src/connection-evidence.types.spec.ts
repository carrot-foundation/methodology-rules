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
  connectionHistory: 'complete',
  documentId: faker.string.uuid(),
  dropOffDate: faker.date.recent().toISOString(),
  generatorPalantirParticipantId: faker.string.uuid(),
  massId: faker.string.uuid(),
  policyVersion: faker.system.semver(),
  preparedAt: faker.date.recent().toISOString(),
  snapshotVersion: faker.date.recent().toISOString(),
  version: 2,
  wasteManagers: [],
  ...partialEvidence,
});

const stubConfirmedEntry = (
  partialEntry: Partial<MassIDConfirmedConnectionEntry> = {},
): MassIDConfirmedConnectionEntry => ({
  confirmedStartDate: '2026-10-01',
  effectiveEndDate: null,
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

  it('should accept a reason of exactly 64 characters', () => {
    const evidence = stubMassIDConnectionEvidence({
      wasteManagers: [
        stubConfirmedEntry({ eligibility: 'review', reason: 'a'.repeat(64) }),
      ],
    });

    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      true,
    );
  });

  it.each([
    { effectiveEndDate: '2026-10-20', scenario: 'an ended connection' },
    {
      effectiveEndDate: '2026-10-01',
      scenario: 'an empty period ending on its start day',
    },
    {
      effectiveEndDate: '2026-09-30',
      scenario: 'a closure scheduled before a future start',
    },
  ])('should accept $scenario', ({ effectiveEndDate }) => {
    const evidence = stubMassIDConnectionEvidence({
      wasteManagers: [stubConfirmedEntry({ effectiveEndDate })],
    });

    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      true,
    );
  });

  it('should accept an incomplete connection history without entries', () => {
    const evidence = stubMassIDConnectionEvidence({
      connectionHistory: 'incomplete',
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
      evidence: {
        ...stubMassIDConnectionEvidence(),
        connectionHistory: undefined,
      },
      scenario: 'evidence without connectionHistory',
    },
    {
      evidence: {
        ...stubMassIDConnectionEvidence(),
        connectionHistory: 'unknown',
      },
      scenario: 'an unknown connectionHistory',
    },
    {
      evidence: { ...stubMassIDConnectionEvidence(), version: 3 },
      scenario: 'an unknown version',
    },
    {
      evidence: {
        ...stubMassIDConnectionEvidence(),
        version: 1,
        wasteManagers: [
          { ...stubConfirmedEntry(), effectiveEndDate: undefined },
        ],
      },
      scenario: 'version 1 evidence, which has no connection end',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          { ...stubConfirmedEntry(), effectiveEndDate: undefined },
        ] as unknown as MassIDConnectionEvidenceWasteManager[],
      }),
      scenario: 'a connection entry without effectiveEndDate',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [stubConfirmedEntry({ effectiveEndDate: '2026-02-30' })],
      }),
      scenario: 'an effectiveEndDate that is not a calendar day',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          stubConfirmedEntry({ effectiveEndDate: '2026-10-20T00:00:00Z' }),
        ],
      }),
      scenario: 'an effectiveEndDate with a time',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [stubConfirmedEntry({ revision: 0 })],
      }),
      scenario: 'a zero revision',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [stubConfirmedEntry({ revision: -1 })],
      }),
      scenario: 'a negative revision',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [stubConfirmedEntry({ revision: 1.5 })],
      }),
      scenario: 'a fractional revision',
    },
    {
      evidence: stubMassIDConnectionEvidence({
        wasteManagers: [
          {
            effectiveEndDate: null,
            eligibility: 'review',
            palantirParticipantId: faker.string.uuid(),
            source: 'integrator',
          } as unknown as MassIDConnectionEvidenceWasteManager,
        ],
      }),
      scenario: 'an integrator entry carrying effectiveEndDate',
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
      evidence: {
        ...stubMassIDConnectionEvidence(),
        unexpectedField: faker.string.uuid(),
      },
      scenario: 'a field outside the contract',
    },
  ])('should reject $scenario', ({ evidence }) => {
    expect(MassIDConnectionEvidenceSchema.safeParse(evidence).success).toBe(
      false,
    );
  });
});
