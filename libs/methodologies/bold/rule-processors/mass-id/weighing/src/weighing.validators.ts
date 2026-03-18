import type {
  MethodologyAdditionalVerification,
  MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';

import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  MethodologyApprovedExceptionType,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type {
  ContainerCapacityApprovedException,
  ContainerQuantityApprovedException,
  TareApprovedException,
} from './weighing.types';

const TareApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MASS_ID),
    }),
    Event: z.literal(DocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName.TARE),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerCapacityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MASS_ID),
    }),
    Event: z.literal(DocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName.CONTAINER_CAPACITY),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerQuantityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MASS_ID),
    }),
    Event: z.literal(DocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName.CONTAINER_QUANTITY),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE,
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const MethodologyAdditionalVerificationSchema = z.object({
  'Layout IDs': z.array(NonEmptyStringSchema).optional(),
  'Verification Type': z.string(),
});

const MethodologyAdditionalVerificationAttributeValueSchema = z.array(
  MethodologyAdditionalVerificationSchema,
);

export const isTareApprovedException = (
  input: unknown,
): input is TareApprovedException =>
  TareApprovedExceptionSchema.safeParse(input).success;

export const isContainerCapacityApprovedException = (
  input: unknown,
): input is ContainerCapacityApprovedException =>
  ContainerCapacityApprovedExceptionSchema.safeParse(input).success;

export const isContainerQuantityApprovedException = (
  input: unknown,
): input is ContainerQuantityApprovedException =>
  ContainerQuantityApprovedExceptionSchema.safeParse(input).success;

export const isAdditionalVerificationAttributeValue = (
  input: unknown,
): input is MethodologyAdditionalVerificationAttributeValue =>
  MethodologyAdditionalVerificationAttributeValueSchema.safeParse(input)
    .success;

export const isMethodologyAdditionalVerification = (
  input: unknown,
): input is MethodologyAdditionalVerification =>
  MethodologyAdditionalVerificationSchema.safeParse(input).success;
