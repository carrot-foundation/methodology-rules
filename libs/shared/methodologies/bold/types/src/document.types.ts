import {
  InboundDocumentSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

import { BoldDocumentEventSchema } from './document-event.types';

export const BoldDocumentSchema = InboundDocumentSchema.extend({
  category: NonEmptyStringSchema,
  externalEvents: z.array(BoldDocumentEventSchema).optional(),
  subtype: NonEmptyStringSchema.optional(),
  type: NonEmptyStringSchema.optional(),
});
export type BoldDocument = z.infer<typeof BoldDocumentSchema>;
