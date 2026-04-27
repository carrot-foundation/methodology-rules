import { z } from 'zod';

import { LatitudeSchema, LongitudeSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';

export const DocumentAddressSchema = z.object({
  city: NonEmptyStringSchema,
  countryCode: NonEmptyStringSchema,
  countryState: NonEmptyStringSchema,
  id: NonEmptyStringSchema,
  latitude: LatitudeSchema.nullish().transform((value) => value ?? undefined),
  longitude: LongitudeSchema.nullish().transform((value) => value ?? undefined),
  neighborhood: NonEmptyStringSchema.nullish().transform(
    (value) => value ?? undefined,
  ),
  number: NonEmptyStringSchema,
  participantId: NonEmptyStringSchema,
  piiSnapshotId: NonEmptyStringSchema,
  street: NonEmptyStringSchema,
  zipCode: NonEmptyStringSchema.nullish().transform(
    (value) => value ?? undefined,
  ),
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
