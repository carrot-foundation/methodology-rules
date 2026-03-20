import { z } from 'zod';

import type { UnknownObject } from '../common.types';
import type {
  MethodologyDocumentEventAttributeFormat,
  MethodologyDocumentEventAttributeType,
} from './methodology-enum.types';

import { DateTimeSchema } from '../common.types';
import { NonNegativeFloatSchema } from '../number.types';
import { type NonEmptyString, NonEmptyStringSchema } from '../string.types';
import { MethodologyAddressSchema } from './methodology-address.types';
import {
  MethodologyAuthorSchema,
  MethodologyParticipantSchema,
} from './methodology-participant.types';

export interface ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: NonEmptyString;
    };
    Event: NonEmptyString;
  };
  'Attribute Name': NonEmptyString;
  'Exception Type': NonEmptyString;
  Reason: NonEmptyString;
  'Valid Until'?: string;
}

export type ApprovedExceptionAttributeValue = ApprovedException[];

export interface MethodologyAdditionalVerification {
  'Layout IDs'?: NonEmptyString[];
  'Verification Type': string;
}

export type MethodologyAdditionalVerificationAttributeValue =
  MethodologyAdditionalVerification[];

const MethodologyDocumentEventAttachmentBaseSchema = z.object({
  attachmentId: NonEmptyStringSchema,
  contentLength: NonNegativeFloatSchema,
  isPublic: z.boolean(),
  label: z.string(),
});

const MethodologyDocumentEventMetadataBaseSchema = z.object({
  attributes: z.array(z.unknown()).optional(),
});

const MethodologyDocumentRelationBaseSchema = z.object({
  category: z.string().optional(),
  documentId: NonEmptyStringSchema,
  subtype: z.string().optional(),
  type: z.string().optional(),
});

export const MethodologyDocumentEventSchema = z.looseObject({
  address: MethodologyAddressSchema,
  attachments: z.array(MethodologyDocumentEventAttachmentBaseSchema).optional(),
  author: MethodologyAuthorSchema,
  deduplicationId: z.string().optional(),
  documentSideEffectUpdates: z.record(z.string(), z.unknown()).optional(),
  externalCreatedAt: DateTimeSchema,
  externalId: z.string().optional(),
  id: NonEmptyStringSchema,
  isPublic: z.boolean(),
  label: z.string().optional(),
  metadata: MethodologyDocumentEventMetadataBaseSchema.optional(),
  name: z.string(),
  participant: MethodologyParticipantSchema,
  preserveSensitiveData: z.boolean().optional(),
  propagatedFrom: z.record(z.string(), z.unknown()).optional(),
  propagateEvent: z.boolean().optional(),
  relatedDocument: MethodologyDocumentRelationBaseSchema.optional(),
  target: z.record(z.string(), z.unknown()).optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  value: z.number().optional(),
});
export type MethodologyDocumentEvent = z.infer<
  typeof MethodologyDocumentEventSchema
>;

export interface MethodologyDocumentEventAttachment {
  attachmentId: string;
  contentLength: number;
  isPublic: boolean;
  label: string;
}

export interface MethodologyDocumentEventAttribute {
  format?: MethodologyDocumentEventAttributeFormat | undefined;
  isPublic: boolean;
  name: string;
  sensitive?: boolean | undefined;
  type?: MethodologyDocumentEventAttributeType | undefined;
  value: MethodologyDocumentEventAttributeValue | undefined;
  valuePrefix?: NonEmptyString | undefined;
  valueSuffix?: NonEmptyString | undefined;
}

export interface MethodologyDocumentEventAttributeReference {
  documentId: string;
  eventId?: string | undefined;
}

export type MethodologyDocumentEventAttributeValue =
  | ApprovedExceptionAttributeValue
  | boolean
  | MethodologyAdditionalVerificationAttributeValue
  | MethodologyDocumentEventAttributeReference
  | null
  | number
  | string
  | unknown[]
  | UnknownObject;

export interface MethodologyDocumentEventMetadata {
  attributes?: MethodologyDocumentEventAttribute[] | undefined;
}

export interface MethodologyDocumentRelation {
  category?: string | undefined;
  documentId: string;
  subtype?: string | undefined;
  type?: string | undefined;
}

export type MethodologyVerificationType = 'CDF' | 'MTR' | 'Scale Ticket';
