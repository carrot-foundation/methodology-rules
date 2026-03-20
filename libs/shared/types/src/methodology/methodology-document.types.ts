import { z } from 'zod';

import { DateTimeSchema } from '../common.types';
import { NonNegativeFloatSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';
import { MethodologyAddressSchema } from './methodology-address.types';
import { MethodologyDocumentEventSchema } from './methodology-document-event.types';
import {
  DataSetNameSchema,
  MethodologyDocumentStatusSchema,
} from './methodology-enum.types';
import { MethodologyParticipantSchema } from './methodology-participant.types';

export const MethodologyDocumentAttachmentSchema = z.looseObject({
  contentLength: NonNegativeFloatSchema,
  fileName: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
});
export type MethodologyDocumentAttachment = z.infer<
  typeof MethodologyDocumentAttachmentSchema
>;

export const MethodologyDocumentSchema = z.looseObject({
  attachments: z.array(MethodologyDocumentAttachmentSchema).optional(),
  category: z.string(),
  createdAt: DateTimeSchema,
  currentValue: NonNegativeFloatSchema,
  dataSetName: DataSetNameSchema,
  deduplicationId: z.string().optional(),
  externalCreatedAt: DateTimeSchema,
  externalEvents: z.array(MethodologyDocumentEventSchema).optional(),
  externalId: z.string().optional(),
  id: NonEmptyStringSchema,
  isPublic: z.boolean().optional(),
  isPubliclySearchable: z.boolean(),
  measurementUnit: z.string(),
  parentDocumentId: z.string().optional(),
  permissions: z.array(z.record(z.string(), z.unknown())).optional(),
  primaryAddress: MethodologyAddressSchema,
  primaryParticipant: MethodologyParticipantSchema,
  status: MethodologyDocumentStatusSchema,
  subtype: z.string().optional(),
  tags: z.record(z.string(), z.string().nullable().optional()).optional(),
  type: z.string().optional(),
  updatedAt: DateTimeSchema,
});
export type MethodologyDocument = z.infer<typeof MethodologyDocumentSchema>;
