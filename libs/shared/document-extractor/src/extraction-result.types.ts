import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ExtractedField } from './document-extractor.types';

export interface EntityInfo {
  name: NonEmptyString;
  taxId: NonEmptyString;
}

export interface EntityWithAddressInfo extends EntityInfo {
  address?: string;
  city?: string;
  state?: string;
}

export interface ExtractedEntityInfo {
  name: ExtractedField<NonEmptyString>;
  taxId: ExtractedField<NonEmptyString>;
}

export interface ExtractedEntityWithAddressInfo extends ExtractedEntityInfo {
  address: ExtractedField<NonEmptyString>;
  city: ExtractedField<NonEmptyString>;
  state: ExtractedField<NonEmptyString>;
}
