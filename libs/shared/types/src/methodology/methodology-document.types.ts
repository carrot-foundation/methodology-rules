import { z } from 'zod';

import type { MethodologyDocumentEvent } from './methodology-document-event.types';

import { DateTimeSchema } from '../common.types';
import { MethodologyAddressSchema } from './methodology-address.types';
import {
  DataSetNameSchema,
  MethodologyDocumentStatusSchema,
} from './methodology-enum.types';
import { MethodologyParticipantSchema } from './methodology-participant.types';

export const MethodologyDocumentAttachmentSchema = z.looseObject({
  contentLength: z.number(),
  fileName: z.string(),
  id: z.string(),
});
export type MethodologyDocumentAttachment = z.infer<
  typeof MethodologyDocumentAttachmentSchema
>;

export const MethodologyDocumentSchema = z.looseObject({
  attachments: z.array(MethodologyDocumentAttachmentSchema).optional(),
  category: z.string(),
  createdAt: DateTimeSchema,
  currentValue: z.number(),
  dataSetName: DataSetNameSchema,
  deduplicationId: z.string().optional(),
  externalCreatedAt: DateTimeSchema,
  externalEvents: z.array(z.custom<MethodologyDocumentEvent>()).optional(),
  externalId: z.string().optional(),
  id: z.string(),
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
