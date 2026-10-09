import {
  DateTimeSchema,
  DocumentIdSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const MassIDConnectionEligibilitySchema = z.enum([
  'eligible',
  'ineligible',
  'review',
]);
export type MassIDConnectionEligibility = z.infer<
  typeof MassIDConnectionEligibilitySchema
>;

const MassIDConnectionEvidenceEntryBaseSchema = z.object({
  palantirParticipantId: NonEmptyStringSchema,
  reason: z
    .string()
    .regex(/^[a-z][\da-z-]*$/, 'reason must be a kebab-case code')
    .optional(),
});

const MassIDIntegratorOnlyEntrySchema =
  MassIDConnectionEvidenceEntryBaseSchema.extend({
    eligibility: MassIDConnectionEligibilitySchema.exclude(['eligible']),
    source: z.literal('integrator'),
  });

const MassIDConfirmedConnectionEntrySchema =
  MassIDConnectionEvidenceEntryBaseSchema.extend({
    confirmedStartDate: z.iso.date(),
    eligibility: MassIDConnectionEligibilitySchema,
    relationId: NonEmptyStringSchema,
    revision: z.int().nonnegative(),
    source: z.enum(['both', 'connection']),
  });

export const MassIDConnectionEvidenceWasteManagerSchema = z.discriminatedUnion(
  'source',
  [MassIDIntegratorOnlyEntrySchema, MassIDConfirmedConnectionEntrySchema],
);
export type MassIDConnectionEvidenceWasteManager = z.infer<
  typeof MassIDConnectionEvidenceWasteManagerSchema
>;

export const MassIDConnectionEvidenceSchema = z
  .object({
    documentId: DocumentIdSchema,
    dropOffDate: DateTimeSchema.nullable(),
    generatorPalantirParticipantId: NonEmptyStringSchema.nullable(),
    massId: DocumentIdSchema,
    policyVersion: NonEmptyStringSchema,
    preparedAt: DateTimeSchema,
    snapshotVersion: DateTimeSchema,
    version: z.literal(1),
    wasteManagers: z
      .array(MassIDConnectionEvidenceWasteManagerSchema)
      .refine(
        (entries) =>
          new Set(entries.map((entry) => entry.palantirParticipantId)).size ===
          entries.length,
        { message: 'Each palantirParticipantId must appear only once' },
      ),
  })
  .refine(
    (evidence) =>
      evidence.generatorPalantirParticipantId !== null ||
      evidence.wasteManagers.every((entry) => entry.source === 'integrator'),
    {
      message:
        'Confirmed connections require generatorPalantirParticipantId, the generator they were resolved from',
      path: ['generatorPalantirParticipantId'],
    },
  );
export type MassIDConnectionEvidence = z.infer<
  typeof MassIDConnectionEvidenceSchema
>;
