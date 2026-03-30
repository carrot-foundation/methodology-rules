import { z } from 'zod';

import { NonNegativeFloatSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';

export const DocumentAttachmentSchema = z.looseObject({
  contentLength: NonNegativeFloatSchema,
  fileName: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
});
export type DocumentAttachment = z.infer<typeof DocumentAttachmentSchema>;
