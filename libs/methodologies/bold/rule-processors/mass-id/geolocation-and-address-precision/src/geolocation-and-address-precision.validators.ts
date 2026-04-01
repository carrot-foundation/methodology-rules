import {
  ApprovedExceptionType,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type {
  GpsLatitudeApprovedException,
  GpsLongitudeApprovedException,
} from './geolocation-and-address-precision.types';

const GpsLatitudeApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MASS_ID),
    }),
    Event: z.union([
      z.literal(DocumentEventName.DROP_OFF),
      z.literal(DocumentEventName.PICK_UP),
    ]),
  }),
  'Attribute Name': z.literal(DocumentEventAttributeName.CAPTURED_GPS_LATITUDE),
  'Exception Type': z.literal(ApprovedExceptionType.MANDATORY_ATTRIBUTE),
  Reason: NonEmptyStringSchema,
  'Valid Until': z.string().optional(),
});

const GpsLongitudeApprovedExceptionSchema = z.object({
  'Attribute Location': z.object({
    Asset: z.object({
      Category: z.literal(DocumentCategory.MASS_ID),
    }),
    Event: z.union([
      z.literal(DocumentEventName.DROP_OFF),
      z.literal(DocumentEventName.PICK_UP),
    ]),
  }),
  'Attribute Name': z.literal(
    DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE,
  ),
  'Exception Type': z.literal(ApprovedExceptionType.MANDATORY_ATTRIBUTE),
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
