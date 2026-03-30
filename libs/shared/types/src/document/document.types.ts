import { z } from 'zod';

import { InboundDocumentSchema } from './inbound-document.types';

export const DocumentSchema = InboundDocumentSchema.strip();
export type Document = z.infer<typeof DocumentSchema>;
