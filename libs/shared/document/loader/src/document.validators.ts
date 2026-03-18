import { DateTimeSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type { DocumentEntity } from './document-loader.types';

const DocumentEntitySchema = z.object({
  createdAt: DateTimeSchema,
  document: z.record(z.string(), z.any()),
  id: z.string(),
  versionDate: DateTimeSchema,
});

export const assertDocumentEntity = (v: unknown): DocumentEntity =>
  DocumentEntitySchema.parse(v);
