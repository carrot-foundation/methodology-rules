import { z } from 'zod';

import { NonEmptyStringSchema } from '../string.types';
import { DataSetNameSchema } from './methodology-enum.types';

export const MethodologyAuthorSchema = z.looseObject({
  clientId: z.string(),
  dataSetName: DataSetNameSchema,
  participantId: z.string(),
});
export type MethodologyAuthor = z.infer<typeof MethodologyAuthorSchema>;

export const MethodologyParticipantSchema = z.looseObject({
  businessName: NonEmptyStringSchema.optional(),
  countryCode: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  taxId: NonEmptyStringSchema,
  taxIdType: NonEmptyStringSchema,
  type: NonEmptyStringSchema,
});
export type MethodologyParticipant = z.infer<
  typeof MethodologyParticipantSchema
>;
