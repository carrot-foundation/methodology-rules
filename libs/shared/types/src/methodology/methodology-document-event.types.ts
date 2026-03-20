import { z } from 'zod';

import { DateTimeSchema } from '../common.types';
import { NonNegativeFloatSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';
import { MethodologyAddressSchema } from './methodology-address.types';
import {
  MethodologyDocumentEventAttributeFormatSchema,
  MethodologyDocumentEventAttributeTypeSchema,
} from './methodology-enum.types';
import {
  MethodologyAuthorSchema,
  MethodologyParticipantSchema,
} from './methodology-participant.types';

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

export const MethodologyAdditionalVerificationSchema = z.object({
  'Layout IDs': z.array(NonEmptyStringSchema).optional(),
  'Verification Type': z.string(),
});
export type MethodologyAdditionalVerification = z.infer<
  typeof MethodologyAdditionalVerificationSchema
>;

export const MethodologyAdditionalVerificationAttributeValueSchema = z.array(
  MethodologyAdditionalVerificationSchema,
);
export type MethodologyAdditionalVerificationAttributeValue = z.infer<
  typeof MethodologyAdditionalVerificationAttributeValueSchema
>;

export const MethodologyDocumentEventAttributeReferenceSchema = z.object({
  documentId: NonEmptyStringSchema,
  eventId: NonEmptyStringSchema.optional(),
});
export type MethodologyDocumentEventAttributeReference = z.infer<
  typeof MethodologyDocumentEventAttributeReferenceSchema
>;

export const MethodologyDocumentEventAttributeValueSchema = z.union([
  ApprovedExceptionAttributeValueSchema,
  MethodologyAdditionalVerificationAttributeValueSchema,
  MethodologyDocumentEventAttributeReferenceSchema,
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);
export type MethodologyDocumentEventAttributeValue = z.infer<
  typeof MethodologyDocumentEventAttributeValueSchema
>;

export const MethodologyDocumentEventAttributeSchema = z.object({
  format: MethodologyDocumentEventAttributeFormatSchema.optional(),
  isPublic: z.boolean(),
  name: z.string(),
  sensitive: z.boolean().optional(),
  type: MethodologyDocumentEventAttributeTypeSchema.optional(),
  value: MethodologyDocumentEventAttributeValueSchema.optional(),
  valuePrefix: NonEmptyStringSchema.optional(),
  valueSuffix: NonEmptyStringSchema.optional(),
});
export type MethodologyDocumentEventAttribute = z.infer<
  typeof MethodologyDocumentEventAttributeSchema
>;

export const MethodologyDocumentEventAttachmentSchema = z.object({
  attachmentId: NonEmptyStringSchema,
  contentLength: NonNegativeFloatSchema,
  isPublic: z.boolean(),
  label: z.string(),
});
export type MethodologyDocumentEventAttachment = z.infer<
  typeof MethodologyDocumentEventAttachmentSchema
>;

export const MethodologyDocumentEventMetadataSchema = z.object({
  attributes: z.array(MethodologyDocumentEventAttributeSchema).optional(),
});
export type MethodologyDocumentEventMetadata = z.infer<
  typeof MethodologyDocumentEventMetadataSchema
>;

export const MethodologyDocumentRelationSchema = z.object({
  category: z.string().optional(),
  documentId: NonEmptyStringSchema,
  subtype: z.string().optional(),
  type: z.string().optional(),
});
export type MethodologyDocumentRelation = z.infer<
  typeof MethodologyDocumentRelationSchema
>;

export const MethodologyDocumentEventSchema = z.looseObject({
  address: MethodologyAddressSchema,
  attachments: z.array(MethodologyDocumentEventAttachmentSchema).optional(),
  author: MethodologyAuthorSchema,
  deduplicationId: z.string().optional(),
  documentSideEffectUpdates: z.record(z.string(), z.unknown()).optional(),
  externalCreatedAt: DateTimeSchema,
  externalId: z.string().optional(),
  id: NonEmptyStringSchema,
  isPublic: z.boolean(),
  label: z.string().optional(),
  metadata: MethodologyDocumentEventMetadataSchema.optional(),
  name: z.string(),
  participant: MethodologyParticipantSchema,
  preserveSensitiveData: z.boolean().optional(),
  propagatedFrom: z.record(z.string(), z.unknown()).optional(),
  propagateEvent: z.boolean().optional(),
  relatedDocument: MethodologyDocumentRelationSchema.optional(),
  target: z.record(z.string(), z.unknown()).optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  value: z.number().optional(),
});
export type MethodologyDocumentEvent = z.infer<
  typeof MethodologyDocumentEventSchema
>;

export type MethodologyVerificationType = 'CDF' | 'MTR' | 'Scale Ticket';
