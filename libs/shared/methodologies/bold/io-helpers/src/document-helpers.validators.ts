import { MethodologyDocumentSchema } from '@carrot-fndn/shared/types';

export const validateDocument = (input: unknown) =>
  MethodologyDocumentSchema.safeParse(input);
