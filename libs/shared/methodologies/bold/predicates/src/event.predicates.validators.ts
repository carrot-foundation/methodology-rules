import { z } from 'zod';

const DocumentEventSchema = z.object({
  address: z.object({}),
  author: z.object({}),
  externalCreatedAt: z.string(),
  id: z.string(),
  isPublic: z.boolean(),
  metadata: z
    .object({
      attributes: z.array(
        z.object({
          name: z.string(),
        }),
      ),
    })
    .optional(),
  name: z.string(),
  participant: z.object({
    id: z.string(),
    type: z.string(),
  }),
});

export const validateDocumentEvent = (input: unknown) =>
  DocumentEventSchema.safeParse(input);
