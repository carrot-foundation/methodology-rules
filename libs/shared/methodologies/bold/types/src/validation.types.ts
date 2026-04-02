import { DocumentEventAttachmentSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import { BoldDocumentEventAttributeSchema } from './document-event.types';

export const BoldDocumentEventWithAttachmentsSchema = z.object({
  attachments: z.array(DocumentEventAttachmentSchema).nonempty(),
});
export type BoldDocumentEventWithAttachments = z.infer<
  typeof BoldDocumentEventWithAttachmentsSchema
>;

export const BoldDocumentEventWithMetadataSchema = z.object({
  metadata: z.object({
    attributes: z.array(BoldDocumentEventAttributeSchema).nonempty(),
  }),
});
export type BoldDocumentEventWithMetadata = z.infer<
  typeof BoldDocumentEventWithMetadataSchema
>;
