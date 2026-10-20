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

const MassIDConnectionEvidenceEntryBaseSchema = z.strictObject({
  palantirParticipantId: NonEmptyStringSchema,
  reason: z
    .string()
    .max(64)
    .regex(
      /^[a-z](?:[\da-z]|-(?=[\da-z]))*$/,
      'reason must be a kebab-case code',
    )
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
    effectiveEndDate: z.iso.date().nullable(),
    eligibility: MassIDConnectionEligibilitySchema,
    relationId: NonEmptyStringSchema,
    revision: z.int().positive(),
    source: z.enum(['both', 'connection']),
  });

export type MassIDConfirmedConnectionEntry = z.infer<
  typeof MassIDConfirmedConnectionEntrySchema
>;

export const MassIDConnectionEvidenceWasteManagerSchema = z.discriminatedUnion(
  'source',
  [MassIDIntegratorOnlyEntrySchema, MassIDConfirmedConnectionEntrySchema],
);
export type MassIDConnectionEvidenceWasteManager = z.infer<
  typeof MassIDConnectionEvidenceWasteManagerSchema
>;

export const MassIDConnectionEvidenceSchema = z
  .strictObject({
    connectionHistory: z.enum(['complete', 'incomplete']),
    documentId: DocumentIdSchema,
    dropOffDate: DateTimeSchema.nullable(),
    generatorPalantirParticipantId: NonEmptyStringSchema.nullable(),
    massId: DocumentIdSchema,
    policyVersion: NonEmptyStringSchema,
    preparedAt: DateTimeSchema,
    snapshotVersion: DateTimeSchema,
    version: z.literal(2),
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
