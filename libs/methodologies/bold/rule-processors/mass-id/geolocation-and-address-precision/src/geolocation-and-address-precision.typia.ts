import { createIs } from 'typia';

import type {
  GpsLatitudeApprovedException,
  GpsLongitudeApprovedException,
} from './geolocation-and-address-precision.types';

export const isGpsLatitudeApprovedException =
  createIs<GpsLatitudeApprovedException>();

export const isGpsLongitudeApprovedException =
  createIs<GpsLongitudeApprovedException>();
