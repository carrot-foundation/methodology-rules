import { z } from 'zod';

import { LatitudeSchema, LongitudeSchema } from '../number.types';
import { NonEmptyStringSchema } from '../string.types';

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
export type MethodologyAddress = z.infer<typeof MethodologyAddressSchema>;
