import {
  MethodologyDocumentSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

import { DocumentEventSchema } from './document-event.types';

export const DocumentSchema = MethodologyDocumentSchema.extend({
  category: NonEmptyStringSchema,
  externalEvents: z.array(DocumentEventSchema).optional(),
  subtype: NonEmptyStringSchema.optional(),
  type: NonEmptyStringSchema.optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
