import { z } from 'zod';

import { LatitudeSchema, LongitudeSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';

export const DocumentAddressSchema = z.object({
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
export type DocumentAddress = z.infer<typeof DocumentAddressSchema>;

export type DocumentAddressWithCoordinates = DocumentAddress & {
  latitude: number;
  longitude: number;
};
