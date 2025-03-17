import { type LicensePlate } from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const validateLicensePlate = (licensePlate: unknown) =>
  is<LicensePlate>(licensePlate);
