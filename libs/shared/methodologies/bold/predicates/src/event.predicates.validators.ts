import { z } from 'zod';

const DocumentEventSchema = z.looseObject({
  address: z.looseObject({}),
  author: z.looseObject({}),
  externalCreatedAt: z.string(),
  id: z.string(),
  isPublic: z.boolean(),
  metadata: z
    .object({
      attributes: z.array(
        z.looseObject({
          name: z.string(),
        }),
      ),
    })
    .optional(),
  name: z.string(),
  participant: z.looseObject({
    id: z.string(),
    type: z.string(),
  }),
});

export const validateDocumentEvent = (input: unknown) =>
  DocumentEventSchema.safeParse(input);
