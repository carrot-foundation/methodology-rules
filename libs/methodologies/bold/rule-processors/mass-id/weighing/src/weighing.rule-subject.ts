import {
  BoldDocumentEventSchema,
  BoldDocumentSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

const MAX_WEIGHING_EVENTS = 2;

export const WeighingRuleSubjectSchema = z.object({
  massIDDocumentId: NonEmptyStringSchema,
  recyclerAccreditationDocument: BoldDocumentSchema,
  weighingEvents: z
    .array(BoldDocumentEventSchema)
    .min(1)
    .max(MAX_WEIGHING_EVENTS),
});

export type WeighingRuleSubject = z.infer<typeof WeighingRuleSubjectSchema>;
