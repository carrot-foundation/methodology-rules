import {
  MethodologyDocumentEventAttributeSchema,
  MethodologyDocumentEventMetadataSchema,
  MethodologyDocumentEventSchema,
  MethodologyDocumentRelationSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const DocumentEventAttributeSchema =
  MethodologyDocumentEventAttributeSchema.extend({
    name: NonEmptyStringSchema,
  });
export type DocumentEventAttribute = z.infer<
  typeof DocumentEventAttributeSchema
>;

export const DocumentEventMetadataSchema =
  MethodologyDocumentEventMetadataSchema.extend({
    attributes: z.array(DocumentEventAttributeSchema).optional(),
  });
export type DocumentEventMetadata = z.infer<typeof DocumentEventMetadataSchema>;

export const DocumentRelationSchema = MethodologyDocumentRelationSchema.extend({
  bidirectional: z.boolean().optional(),
  category: NonEmptyStringSchema.optional(),
  subtype: NonEmptyStringSchema.optional(),
  type: NonEmptyStringSchema.optional(),
});
export type DocumentRelation = z.infer<typeof DocumentRelationSchema>;

export const DocumentEventSchema = MethodologyDocumentEventSchema.extend({
  metadata: DocumentEventMetadataSchema.optional(),
  name: NonEmptyStringSchema,
  relatedDocument: DocumentRelationSchema.optional(),
});
export type DocumentEvent = z.infer<typeof DocumentEventSchema>;
