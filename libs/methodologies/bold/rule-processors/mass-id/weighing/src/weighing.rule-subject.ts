import {
  BoldDocumentEventSchema,
  BoldDocumentSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

const MAX_WEIGHING_EVENTS = 2;

export const WeighingRuleSubjectSchema = z
  .object({
    massIDDocumentId: NonEmptyStringSchema,
    recyclerAccreditationDocument: BoldDocumentSchema,
    weighingEvents: z.array(BoldDocumentEventSchema).min(1),
  })
  .superRefine((data, context) => {
    if (data.weighingEvents.length > MAX_WEIGHING_EVENTS) {
      context.addIssue({
        code: 'too_big',
        inclusive: true,
        maximum: MAX_WEIGHING_EVENTS,
        message: `Expected at most ${MAX_WEIGHING_EVENTS} weighing events (single-step or two-step), but received ${data.weighingEvents.length}.`,
        path: ['weighingEvents'],
        type: 'array',
      });
    }
  });

export type WeighingRuleSubject = z.infer<typeof WeighingRuleSubjectSchema>;
