import { MethodologyDocumentSchema } from '@carrot-fndn/shared/types';

export const validateDocument = (
  input: unknown,
): ReturnType<typeof MethodologyDocumentSchema.safeParse> =>
  MethodologyDocumentSchema.safeParse(input);
