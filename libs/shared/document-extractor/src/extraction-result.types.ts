import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface EntityInfo {
  name: NonEmptyString;
  taxId: NonEmptyString;
}

export interface EntityWithAddressInfo extends EntityInfo {
  address?: string;
  city?: string;
  state?: string;
}
