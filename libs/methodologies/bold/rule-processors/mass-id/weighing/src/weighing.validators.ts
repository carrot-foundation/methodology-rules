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
      Category: z.literal(DocumentCategory.MassID),
    }),
    Event: z.literal(DocumentEventName.Weighing),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName.Tare),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType['Exemption for Mandatory Attribute'],
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerCapacityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MassID),
    }),
    Event: z.literal(DocumentEventName.Weighing),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName['Container Capacity']),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType['Exemption for Mandatory Attribute'],
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const ContainerQuantityApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MassID),
    }),
    Event: z.literal(DocumentEventName.Weighing),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName['Container Quantity']),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType['Exemption for Mandatory Attribute'],
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
