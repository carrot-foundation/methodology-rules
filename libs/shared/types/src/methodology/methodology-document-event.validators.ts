import type { ApprovedExceptionAttributeValue } from './methodology-document-event.types';

import { ApprovedExceptionAttributeValueSchema } from './methodology-document-event.types';

export const isApprovedExceptionAttributeValue = (
  v: unknown,
): v is ApprovedExceptionAttributeValue =>
  ApprovedExceptionAttributeValueSchema.safeParse(v).success;
