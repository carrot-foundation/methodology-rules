import { InboundDocumentSchema } from '@carrot-fndn/shared/types';

export const validateDocument = (
  input: unknown,
): ReturnType<typeof InboundDocumentSchema.safeParse> =>
  InboundDocumentSchema.safeParse(input);
