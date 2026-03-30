import { z } from 'zod';

import { DateTimeSchema } from '../common.types';
import { NonNegativeFloatSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';
import { DocumentAddressSchema } from './document-address.types';
import { DocumentAttachmentSchema } from './document-attachment.types';
import { DataSetNameSchema, DocumentStatusSchema } from './document-enum.types';
import { DocumentEventSchema } from './document-event.types';
import { DocumentParticipantSchema } from './document-participant.types';

export const InboundDocumentSchema = z.looseObject({
  attachments: z.array(DocumentAttachmentSchema).optional(),
  category: z.string(),
  createdAt: DateTimeSchema,
  currentValue: NonNegativeFloatSchema,
  dataSetName: DataSetNameSchema,
  deduplicationId: z.string().optional(),
  externalCreatedAt: DateTimeSchema,
  externalEvents: z.array(DocumentEventSchema).optional(),
  externalId: z.string().optional(),
  id: NonEmptyStringSchema,
  isPublic: z.boolean().optional(),
  isPubliclySearchable: z.boolean(),
  measurementUnit: z.string(),
  parentDocumentId: z.string().optional(),
  permissions: z.array(z.record(z.string(), z.unknown())).optional(),
  primaryAddress: DocumentAddressSchema,
  primaryParticipant: DocumentParticipantSchema,
  status: DocumentStatusSchema,
  subtype: z.string().optional(),
  tags: z.record(z.string(), z.string().nullable().optional()).optional(),
  type: z.string().optional(),
  updatedAt: DateTimeSchema,
});
export type InboundDocument = z.infer<typeof InboundDocumentSchema>;
