import { createIs } from 'typia';

import { type ApprovedExceptionAttributeValue } from './methodology-document-event.types';

export const isApprovedExceptionAttributeValue =
  createIs<ApprovedExceptionAttributeValue>();
