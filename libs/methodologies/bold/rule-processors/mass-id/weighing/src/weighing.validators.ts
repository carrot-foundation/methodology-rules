import type {
  AdditionalVerification,
  AdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';

import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type {
  ContainerCapacityApprovedException,
  ContainerQuantityApprovedException,
  TareApprovedException,
} from './weighing.types';

const TareApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(BoldDocumentCategory.MASS_ID),
    }),
    Event: z.literal(BoldDocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(BoldAttributeName.TARE),
  'Exception Type': z.literal(BoldApprovedExceptionType.MANDATORY_ATTRIBUTE),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerCapacityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(BoldDocumentCategory.MASS_ID),
    }),
    Event: z.literal(BoldDocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(BoldAttributeName.CONTAINER_CAPACITY),
  'Exception Type': z.literal(BoldApprovedExceptionType.MANDATORY_ATTRIBUTE),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerQuantityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(BoldDocumentCategory.MASS_ID),
    }),
    Event: z.literal(BoldDocumentEventName.WEIGHING),
  }),
  'Attribute Name': z.literal(BoldAttributeName.CONTAINER_QUANTITY),
  'Exception Type': z.literal(BoldApprovedExceptionType.MANDATORY_ATTRIBUTE),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const AdditionalVerificationSchema = z.object({
  'Layout IDs': z.array(NonEmptyStringSchema).optional(),
  'Verification Type': z.string(),
});

const AdditionalVerificationAttributeValueSchema = z.array(
  AdditionalVerificationSchema,
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
): input is AdditionalVerificationAttributeValue =>
  AdditionalVerificationAttributeValueSchema.safeParse(input).success;

export const isAdditionalVerification = (
  input: unknown,
): input is AdditionalVerification =>
  AdditionalVerificationSchema.safeParse(input).success;
