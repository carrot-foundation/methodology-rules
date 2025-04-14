import { type ApprovedExceptionAttributeValue } from '@carrot-fndn/shared/types';
import { createIs } from 'typia';

export const isApprovedExceptionAttributeValue =
  createIs<ApprovedExceptionAttributeValue>();
