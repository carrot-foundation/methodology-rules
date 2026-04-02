import {
  DocumentEventAttributeSchema as BaseDocumentEventAttributeSchema,
  DocumentEventMetadataSchema as BaseDocumentEventMetadataSchema,
  DocumentEventRelationSchema as BaseDocumentEventRelationSchema,
  DocumentEventSchema as BaseDocumentEventSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const BoldDocumentEventAttributeSchema =
  BaseDocumentEventAttributeSchema.extend({
    name: NonEmptyStringSchema,
  });
export type BoldDocumentEventAttribute = z.infer<
  typeof BoldDocumentEventAttributeSchema
>;

export const BoldDocumentEventMetadataSchema =
  BaseDocumentEventMetadataSchema.extend({
    attributes: z.array(BoldDocumentEventAttributeSchema).optional(),
  });
export type BoldDocumentEventMetadata = z.infer<
  typeof BoldDocumentEventMetadataSchema
>;

export const BoldDocumentRelationSchema =
  BaseDocumentEventRelationSchema.extend({
    bidirectional: z.boolean().optional(),
    category: NonEmptyStringSchema.optional(),
    subtype: NonEmptyStringSchema.optional(),
    type: NonEmptyStringSchema.optional(),
  });
export type BoldDocumentRelation = z.infer<typeof BoldDocumentRelationSchema>;

export const BoldDocumentEventSchema = BaseDocumentEventSchema.extend({
  metadata: BoldDocumentEventMetadataSchema.optional(),
  name: NonEmptyStringSchema,
  relatedDocument: BoldDocumentRelationSchema.optional(),
});
export type BoldDocumentEvent = z.infer<typeof BoldDocumentEventSchema>;
