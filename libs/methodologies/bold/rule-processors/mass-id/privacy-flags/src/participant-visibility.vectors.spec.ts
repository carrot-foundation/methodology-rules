import { BoldActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { ParticipantOccurrence } from './privacy-flags.helpers';

import { resolveParticipantVisibility } from './privacy-flags.helpers';

const VectorOccurrenceSchema = z.object({
  preserveSensitiveData: z.boolean().optional(),
  role: z.string(),
});

const VectorsFileSchema = z.object({
  vectors: z.array(
    z.object({
      decidedBy: z.number(),
      expected: z.enum(['private', 'public']),
      id: z.string(),
      occurrences: z.array(VectorOccurrenceSchema),
      participantType: z.string(),
    }),
  ),
});

const { vectors } = VectorsFileSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, 'participant-visibility.vectors.json'),
      'utf8',
    ),
  ),
);

// BOLD spells the network integrator role "Integrator" on the wire; the vendored spec spells it "Network Integrator".
const SPEC_ROLE_LABELS: ReadonlyMap<string, string> = new Map([
  ['Network Integrator', BoldActorType.INTEGRATOR],
]);

const NO_PARTICIPANT_TYPE =
  'DocumentParticipant.type carries the actor kind, never COMPANY or INDIVIDUAL, so the spec step 5 participant-type fallback is not modelled';

const UNEXPRESSIBLE_VECTORS: ReadonlyMap<string, string> = new Map([
  ['unknown-role-company-is-public', NO_PARTICIPANT_TYPE],
  ['unknown-role-individual-is-private', NO_PARTICIPANT_TYPE],
]);

const sortAlphabetically = (a: string, b: string): number => a.localeCompare(b);

const toOccurrences = (
  occurrences: readonly z.infer<typeof VectorOccurrenceSchema>[],
): ParticipantOccurrence[] =>
  occurrences.map(({ preserveSensitiveData, role }) => ({
    preserveSensitiveData,
    role: SPEC_ROLE_LABELS.get(role) ?? role,
  }));

const expressible = vectors.filter(({ id }) => !UNEXPRESSIBLE_VECTORS.has(id));
const unexpressible = vectors
  .filter(({ id }) => UNEXPRESSIBLE_VECTORS.has(id))
  .map((vector) => ({
    ...vector,
    reason: UNEXPRESSIBLE_VECTORS.get(vector.id),
  }));

describe('participant-visibility.vectors.json', () => {
  it('should account for every vendored vector as either expressible or explicitly unexpressible', () => {
    expect(expressible.length + unexpressible.length).toBe(vectors.length);
    expect(unexpressible.map(({ id }) => id).sort(sortAlphabetically)).toEqual(
      [...UNEXPRESSIBLE_VECTORS.keys()].sort(sortAlphabetically),
    );
  });

  it.each(expressible)(
    'should resolve $id to $expected by spec step $decidedBy',
    ({ expected, occurrences }) => {
      expect(resolveParticipantVisibility(toOccurrences(occurrences))).toBe(
        expected,
      );
    },
  );

  it.each(unexpressible)(
    'should decline to resolve $id, skipped because $reason',
    ({ occurrences }) => {
      expect(
        resolveParticipantVisibility(toOccurrences(occurrences)),
      ).toBeUndefined();
    },
  );
});
