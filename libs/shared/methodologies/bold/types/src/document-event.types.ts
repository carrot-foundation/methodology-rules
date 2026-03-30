import {
  DocumentEventAttributeSchema as BaseDocumentEventAttributeSchema,
  DocumentEventMetadataSchema as BaseDocumentEventMetadataSchema,
  DocumentEventRelationSchema as BaseDocumentEventRelationSchema,
  DocumentEventSchema as BaseDocumentEventSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const DocumentEventAttributeSchema =
  BaseDocumentEventAttributeSchema.extend({
    name: NonEmptyStringSchema,
  });
export type DocumentEventAttribute = z.infer<
  typeof DocumentEventAttributeSchema
>;

export const DocumentEventMetadataSchema =
  BaseDocumentEventMetadataSchema.extend({
    attributes: z.array(DocumentEventAttributeSchema).optional(),
  });
export type DocumentEventMetadata = z.infer<typeof DocumentEventMetadataSchema>;

export const DocumentRelationSchema = BaseDocumentEventRelationSchema.extend({
  bidirectional: z.boolean().optional(),
  category: NonEmptyStringSchema.optional(),
  subtype: NonEmptyStringSchema.optional(),
  type: NonEmptyStringSchema.optional(),
});
export type DocumentRelation = z.infer<typeof DocumentRelationSchema>;

export const DocumentEventSchema = BaseDocumentEventSchema.extend({
  metadata: DocumentEventMetadataSchema.optional(),
  name: NonEmptyStringSchema,
  relatedDocument: DocumentRelationSchema.optional(),
});
export type DocumentEvent = z.infer<typeof DocumentEventSchema>;
