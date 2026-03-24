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
  GpsLatitudeApprovedException,
  GpsLongitudeApprovedException,
} from './geolocation-and-address-precision.types';

const GpsLatitudeApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MassID),
    }),
    Event: z.union([
      z.literal(DocumentEventName['Drop-off']),
      z.literal(DocumentEventName['Pick-up']),
    ]),
  }),
  'Attribute Name': z.literal(
    DocumentEventAttributeName['Captured GPS Latitude'],
  ),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType['Exemption for Mandatory Attribute'],
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const GpsLongitudeApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MassID),
    }),
    Event: z.union([
      z.literal(DocumentEventName['Drop-off']),
      z.literal(DocumentEventName['Pick-up']),
    ]),
  }),
  'Attribute Name': z.literal(
    DocumentEventAttributeName['Captured GPS Longitude'],
  ),
  'Exception Type': z.literal(
    MethodologyApprovedExceptionType['Exemption for Mandatory Attribute'],
  ),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

export const isGpsLatitudeApprovedException = (
  input: unknown,
): input is GpsLatitudeApprovedException =>
  GpsLatitudeApprovedExceptionSchema.safeParse(input).success;

export const isGpsLongitudeApprovedException = (
  input: unknown,
): input is GpsLongitudeApprovedException =>
  GpsLongitudeApprovedExceptionSchema.safeParse(input).success;
