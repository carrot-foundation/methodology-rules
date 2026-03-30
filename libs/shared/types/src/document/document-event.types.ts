import { z } from 'zod';

import { DateTimeSchema } from '../common.types';
import { NonNegativeFloatSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';
import { DocumentAddressSchema } from './document-address.types';
import { DocumentAuthorSchema } from './document-author.types';
import {
  DocumentEventAttributeFormatSchema,
  DocumentEventAttributeTypeSchema,
} from './document-enum.types';
import { DocumentParticipantSchema } from './document-participant.types';

// --- ApprovedException (unchanged names — not Methodology-prefixed) ---

export const ApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({ Category: NonEmptyStringSchema }),
    Event: NonEmptyStringSchema,
  }),
  'Attribute Name': NonEmptyStringSchema,
  'Exception Type': NonEmptyStringSchema,
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});
export type ApprovedException = z.infer<typeof ApprovedExceptionSchema>;

export const ApprovedExceptionAttributeValueSchema = z.array(
  ApprovedExceptionSchema,
);
export type ApprovedExceptionAttributeValue = z.infer<
  typeof ApprovedExceptionAttributeValueSchema
>;

// --- AdditionalVerification (renamed from MethodologyAdditionalVerification) ---

export const AdditionalVerificationSchema = z.object({
  'Layout IDs': z.array(NonEmptyStringSchema).optional(),
  'Verification Type': z.string(),
});
export type AdditionalVerification = z.infer<
  typeof AdditionalVerificationSchema
>;

export const AdditionalVerificationAttributeValueSchema = z.array(
  AdditionalVerificationSchema,
);
export type AdditionalVerificationAttributeValue = z.infer<
  typeof AdditionalVerificationAttributeValueSchema
>;

// --- DocumentEventAttributeReference (renamed) ---

export const DocumentEventAttributeReferenceSchema = z.object({
  documentId: NonEmptyStringSchema,
  eventId: NonEmptyStringSchema.optional(),
});
export type DocumentEventAttributeReference = z.infer<
  typeof DocumentEventAttributeReferenceSchema
>;

// --- DocumentEventAttributeValue (renamed) ---

export const DocumentEventAttributeValueSchema = z.union([
  ApprovedExceptionAttributeValueSchema,
  AdditionalVerificationAttributeValueSchema,
  DocumentEventAttributeReferenceSchema,
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);
export type DocumentEventAttributeValue = z.infer<
  typeof DocumentEventAttributeValueSchema
>;

// --- DocumentEventAttribute (renamed) ---

export const DocumentEventAttributeSchema = z.object({
  format: DocumentEventAttributeFormatSchema.optional(),
  isPublic: z.boolean(),
  name: z.string(),
  sensitive: z.boolean().optional(),
  type: DocumentEventAttributeTypeSchema.optional(),
  value: z.union([DocumentEventAttributeValueSchema, z.undefined()]),
  valuePrefix: NonEmptyStringSchema.optional(),
  valueSuffix: NonEmptyStringSchema.optional(),
});
export type DocumentEventAttribute = z.infer<
  typeof DocumentEventAttributeSchema
>;

// --- DocumentEventAttachment (renamed) ---

export const DocumentEventAttachmentSchema = z.object({
  attachmentId: NonEmptyStringSchema,
  contentLength: NonNegativeFloatSchema,
  isPublic: z.boolean(),
  label: z.string(),
});
export type DocumentEventAttachment = z.infer<
  typeof DocumentEventAttachmentSchema
>;

// --- DocumentEventMetadata (renamed) ---

export const DocumentEventMetadataSchema = z.object({
  attributes: z.array(DocumentEventAttributeSchema).optional(),
});
export type DocumentEventMetadata = z.infer<typeof DocumentEventMetadataSchema>;

// --- DocumentEventRelation (renamed from MethodologyDocumentRelation) ---

export const DocumentEventRelationSchema = z.object({
  category: z.string().optional(),
  documentId: NonEmptyStringSchema,
  subtype: z.string().optional(),
  type: z.string().optional(),
});
export type DocumentEventRelation = z.infer<typeof DocumentEventRelationSchema>;

// --- DocumentEventSchema (renamed from MethodologyDocumentEventSchema) ---

export const DocumentEventSchema = z.object({
  address: DocumentAddressSchema,
  attachments: z.array(DocumentEventAttachmentSchema).optional(),
  author: DocumentAuthorSchema,
  deduplicationId: z.string().optional(),
  documentSideEffectUpdates: z.record(z.string(), z.unknown()).optional(),
  externalCreatedAt: DateTimeSchema,
  externalId: z.string().optional(),
  id: NonEmptyStringSchema,
  isPublic: z.boolean(),
  label: z.string().optional(),
  metadata: DocumentEventMetadataSchema.optional(),
  name: z.string(),
  participant: DocumentParticipantSchema,
  preserveSensitiveData: z.boolean().optional(),
  propagatedFrom: z.record(z.string(), z.unknown()).optional(),
  propagateEvent: z.boolean().optional(),
  relatedDocument: DocumentEventRelationSchema.optional(),
  target: z.record(z.string(), z.unknown()).optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  value: z.number().optional(),
});
export type DocumentEvent = z.infer<typeof DocumentEventSchema>;

export type DocumentVerificationType = 'CDF' | 'MTR' | 'Scale Ticket';

// --- Validator (moved from methodology-document-event.validators.ts) ---

export const isApprovedExceptionAttributeValue = (
  v: unknown,
): v is ApprovedExceptionAttributeValue =>
  ApprovedExceptionAttributeValueSchema.safeParse(v).success;
