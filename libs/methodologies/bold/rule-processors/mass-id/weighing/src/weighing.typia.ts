import {
  type ApprovedExceptionAttributeValue,
  type MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';
import { createIs } from 'typia';

import {
  type ContainerCapacityApprovedException,
  type TareApprovedException,
} from './weighing.types';

export const isApprovedExceptionAttributeValue =
  createIs<ApprovedExceptionAttributeValue>();

export const isTareApprovedException = createIs<TareApprovedException>();

export const isContainerCapacityApprovedException =
  createIs<ContainerCapacityApprovedException>();

export const isAdditionalVerificationAttributeValue =
  createIs<MethodologyAdditionalVerificationAttributeValue>();
