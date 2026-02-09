import type {
  BaseExtractedData,
  EntityInfo,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface CdfExtractedData extends BaseExtractedData {
  documentNumber: ExtractedField<NonEmptyString>;
  documentType: 'recyclingManifest';
  environmentalLicense?: ExtractedField<NonEmptyString>;
  generator: ExtractedField<EntityInfo>;
  issueDate: ExtractedField<NonEmptyString>;
  processingPeriod?: ExtractedField<NonEmptyString>;
  processor: ExtractedField<EntityInfo>;
  treatmentMethod?: ExtractedField<NonEmptyString>;
  wasteQuantity?: ExtractedField<number>;
}

export const CDF_REQUIRED_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'processor',
] as const;

export const CDF_ALL_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'processor',
  'environmentalLicense',
  'wasteQuantity',
  'treatmentMethod',
  'processingPeriod',
] as const;
