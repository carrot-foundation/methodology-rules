import { DocumentEventAttachmentSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import { DocumentEventAttributeSchema } from './document-event.types';

export const DocumentEventWithAttachmentsSchema = z.object({
  attachments: z.array(DocumentEventAttachmentSchema).nonempty(),
});
export type DocumentEventWithAttachments = z.infer<
  typeof DocumentEventWithAttachmentsSchema
>;

export const DocumentEventWithMetadataSchema = z.object({
  metadata: z.object({
    attributes: z.array(DocumentEventAttributeSchema).nonempty(),
  }),
});
export type DocumentEventWithMetadata = z.infer<
  typeof DocumentEventWithMetadataSchema
>;
