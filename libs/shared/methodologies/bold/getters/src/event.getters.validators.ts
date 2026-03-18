import { z } from 'zod';

const DocumentEventWithMetadataSchema = z.looseObject({
  metadata: z.object({
    attributes: z
      .array(
        z.looseObject({
          isPublic: z.boolean(),
          name: z.string(),
          value: z.unknown().optional(),
        }),
      )
      .nonempty(),
  }),
});

const DocumentEventWithAttachmentsSchema = z.looseObject({
  attachments: z
    .array(
      z.looseObject({
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
