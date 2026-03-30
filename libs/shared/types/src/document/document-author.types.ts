import { z } from 'zod';

import { NonEmptyStringSchema } from '../string.types';
import { DataSetNameSchema } from './document-enum.types';

export const DocumentAuthorSchema = z.looseObject({
  clientId: NonEmptyStringSchema,
  dataSetName: DataSetNameSchema,
  participantId: NonEmptyStringSchema,
});
export type DocumentAuthor = z.infer<typeof DocumentAuthorSchema>;
