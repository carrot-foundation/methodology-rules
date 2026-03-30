import { z } from 'zod';

const DocumentEventWithMetadataSchema = z.object({
  metadata: z.object({
    attributes: z
      .array(
        z.object({
          isPublic: z.boolean(),
          name: z.string(),
          value: z.unknown().optional(),
        }),
      )
      .nonempty(),
  }),
});

const DocumentEventWithAttachmentsSchema = z.object({
  attachments: z
    .array(
      z.object({
        attachmentId: z.string(),
        contentLength: z.number(),
        isPublic: z.boolean(),
        label: z.string(),
      }),
    )
    .nonempty(),
});

export const validateDocumentEventWithMetadata = (input: unknown) =>
  DocumentEventWithMetadataSchema.safeParse(input);

export const validateDocumentEventWithAttachments = (input: unknown) =>
  DocumentEventWithAttachmentsSchema.safeParse(input);
