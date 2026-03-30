import { z } from 'zod';

import { NonEmptyStringSchema } from '../string.types';

export const DocumentParticipantSchema = z.looseObject({
  businessName: NonEmptyStringSchema.optional(),
  countryCode: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  taxId: NonEmptyStringSchema,
  taxIdType: NonEmptyStringSchema,
  type: NonEmptyStringSchema,
});
export type DocumentParticipant = z.infer<typeof DocumentParticipantSchema>;
