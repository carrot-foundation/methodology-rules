import { z } from 'zod';

import { NonEmptyStringSchema } from '../string.types';

const ApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: NonEmptyStringSchema,
    }),
    Event: NonEmptyStringSchema,
  }),
  'Attribute Name': NonEmptyStringSchema,
  'Exception Type': NonEmptyStringSchema,
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

export const ApprovedExceptionAttributeValueSchema = z.array(
  ApprovedExceptionSchema,
);

export const isApprovedExceptionAttributeValue = (
  v: unknown,
): v is z.infer<typeof ApprovedExceptionAttributeValueSchema> =>
  ApprovedExceptionAttributeValueSchema.safeParse(v).success;
