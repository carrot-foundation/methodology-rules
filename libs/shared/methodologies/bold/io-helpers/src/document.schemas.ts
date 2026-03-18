import {
  LatitudeSchema,
  LongitudeSchema,
  NonEmptyStringSchema,
} from '@carrot-fndn/shared/types';
import { z } from 'zod';

export const MethodologyAddressSchema = z.looseObject({
  city: NonEmptyStringSchema,
  countryCode: NonEmptyStringSchema,
  countryState: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  neighborhood: NonEmptyStringSchema,
  number: NonEmptyStringSchema,
  participantId: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  street: NonEmptyStringSchema,
  zipCode: NonEmptyStringSchema,
});

export const MethodologyParticipantSchema = z.looseObject({
  businessName: NonEmptyStringSchema.optional(),
  countryCode: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  taxId: NonEmptyStringSchema,
  taxIdType: NonEmptyStringSchema,
  type: NonEmptyStringSchema,
});
