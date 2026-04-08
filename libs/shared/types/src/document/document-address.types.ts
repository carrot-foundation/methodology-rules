import { z } from 'zod';

import { LatitudeSchema, LongitudeSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';

export const DocumentAddressSchema = z.object({
  city: NonEmptyStringSchema,
  countryCode: NonEmptyStringSchema,
  countryState: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  latitude: LatitudeSchema.optional(),
  longitude: LongitudeSchema.optional(),
  neighborhood: NonEmptyStringSchema,
  number: NonEmptyStringSchema,
  participantId: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  street: NonEmptyStringSchema,
  zipCode: NonEmptyStringSchema.optional(),
});
export type DocumentAddress = z.infer<typeof DocumentAddressSchema>;

export const DocumentAddressWithCoordinatesSchema =
  DocumentAddressSchema.extend({
    latitude: LatitudeSchema,
    longitude: LongitudeSchema,
  });
export type DocumentAddressWithCoordinates = z.infer<
  typeof DocumentAddressWithCoordinatesSchema
>;
