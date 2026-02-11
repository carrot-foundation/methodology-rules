import type {
  BaseExtractedData,
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface CdfExtractedData extends BaseExtractedData {
  documentNumber: ExtractedField<NonEmptyString>;
  documentType: 'recyclingManifest';
  environmentalLicense?: ExtractedField<NonEmptyString>;
  generator: ExtractedEntityWithAddressInfo;
  issueDate: ExtractedField<NonEmptyString>;
  processingPeriod?: ExtractedField<NonEmptyString>;
  recycler: ExtractedEntityInfo;
  transportManifests?: ExtractedField<string[]>;
  treatmentMethod?: ExtractedField<NonEmptyString>;
  wasteEntries?: ExtractedField<WasteEntry[]>;
}

export interface WasteEntry {
  classification?: string;
  code?: string;
  description: string;
  quantity?: number;
  technology?: string;
  unit?: string;
}

export const CDF_REQUIRED_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'recycler',
] as const;

export const CDF_ALL_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'recycler',
  'environmentalLicense',
  'wasteEntries',
  'treatmentMethod',
  'processingPeriod',
  'transportManifests',
] as const;
