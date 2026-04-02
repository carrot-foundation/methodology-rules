import { z } from 'zod';

import { DateTimeSchema } from '../common.types';
import { DocumentIdSchema } from '../string.types';
import { InboundDocumentSchema } from './inbound-document.types';

export const LoadedDocumentEnvelopeSchema = z.object({
  createdAt: DateTimeSchema,
  document: InboundDocumentSchema,
  id: DocumentIdSchema,
  versionDate: DateTimeSchema,
});
export type LoadedDocumentEnvelope = z.infer<
  typeof LoadedDocumentEnvelopeSchema
>;
