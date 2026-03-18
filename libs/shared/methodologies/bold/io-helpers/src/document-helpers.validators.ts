import { z } from 'zod';

import {
  MethodologyAddressSchema,
  MethodologyParticipantSchema,
} from './document.schemas';

const DocumentSchema = z.looseObject({
  category: z.string(),
  createdAt: z.string(),
  currentValue: z.number(),
  dataSetName: z.string(),
  externalCreatedAt: z.string(),
  id: z.string(),
  isPubliclySearchable: z.boolean(),
  measurementUnit: z.string(),
  primaryAddress: MethodologyAddressSchema,
  primaryParticipant: MethodologyParticipantSchema,
  status: z.string(),
  updatedAt: z.string(),
});

export const validateDocument = (input: unknown) =>
  DocumentSchema.safeParse(input);
