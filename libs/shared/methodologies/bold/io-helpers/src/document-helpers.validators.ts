import { z } from 'zod';

const DocumentSchema = z.looseObject({
  category: z.string(),
  createdAt: z.string(),
  currentValue: z.number(),
  dataSetName: z.string(),
  externalCreatedAt: z.string(),
  id: z.string(),
  isPubliclySearchable: z.boolean(),
  measurementUnit: z.string(),
  primaryAddress: z.looseObject({}),
  primaryParticipant: z.looseObject({}),
  status: z.string(),
  updatedAt: z.string(),
});

export const validateDocument = (input: unknown) =>
  DocumentSchema.safeParse(input);
