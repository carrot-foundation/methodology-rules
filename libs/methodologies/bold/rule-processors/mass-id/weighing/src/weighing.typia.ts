import {
  type MethodologyAdditionalVerification,
  type MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';
import { createIs } from 'typia';

import {
  type ContainerCapacityApprovedException,
  type ContainerQuantityApprovedException,
  type TareApprovedException,
} from './weighing.types';

export const isTareApprovedException = createIs<TareApprovedException>();

export const isContainerCapacityApprovedException =
  createIs<ContainerCapacityApprovedException>();

export const isContainerQuantityApprovedException =
  createIs<ContainerQuantityApprovedException>();

export const isAdditionalVerificationAttributeValue =
  createIs<MethodologyAdditionalVerificationAttributeValue>();

export const isMethodologyAdditionalVerification =
  createIs<MethodologyAdditionalVerification>();
