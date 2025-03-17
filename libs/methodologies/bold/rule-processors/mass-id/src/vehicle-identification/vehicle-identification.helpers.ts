import { type LicensePlate } from '@carrot-fndn/shared/types';
import { is } from 'typia';

export const isValidLicensePlate = (licensePlate: unknown) =>
  is<LicensePlate>(licensePlate);
