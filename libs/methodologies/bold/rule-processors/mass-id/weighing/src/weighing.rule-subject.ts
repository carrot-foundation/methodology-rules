import {
  BoldDocumentEventSchema,
  BoldDocumentSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import { NOT_FOUND_RESULT_COMMENTS } from './weighing.constants';

const MAX_WEIGHING_EVENTS = 2;

export const WeighingRuleSubjectSchema = z.object({
  massIDDocumentId: NonEmptyStringSchema,
  recyclerAccreditationDocument: BoldDocumentSchema,
  weighingEvents: z
    .array(BoldDocumentEventSchema)
    .superRefine((events, context) => {
      if (events.length === 0) {
        context.addIssue(NOT_FOUND_RESULT_COMMENTS.NO_WEIGHING_EVENTS);
      } else if (events.length > MAX_WEIGHING_EVENTS) {
        context.addIssue(
          NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
        );
      }
    }),
});

export type WeighingRuleSubject = z.infer<typeof WeighingRuleSubjectSchema>;
