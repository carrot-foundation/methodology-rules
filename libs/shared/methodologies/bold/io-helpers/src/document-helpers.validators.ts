import { BoldDocumentSchema } from '@carrot-fndn/shared/methodologies/bold/types';

export const validateDocument = (
  input: unknown,
): ReturnType<typeof BoldDocumentSchema.safeParse> =>
  BoldDocumentSchema.safeParse(input);
