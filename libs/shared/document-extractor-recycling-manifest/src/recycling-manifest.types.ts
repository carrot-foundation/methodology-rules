import type {
  BaseExtractedData,
  ExtractedEntityInfo,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface CdfExtractedData extends BaseExtractedData {
  documentNumber?: ExtractedField<NonEmptyString>;
  documentType: 'recyclingManifest';
  environmentalLicense?: ExtractedField<NonEmptyString>;
  generator?: ExtractedEntityWithAddressInfo;
  issueDate?: ExtractedField<NonEmptyString>;
  processingPeriod?: ExtractedField<NonEmptyString>;
  receiptEntries?: ExtractedField<ReceiptEntry[]>;
  recycler?: ExtractedEntityInfo;
  transportManifests?: ExtractedField<string[]>;
  treatmentMethod?: ExtractedField<NonEmptyString>;
  wasteEntries?: ExtractedField<WasteEntry[]>;
}

export interface ReceiptEntry {
  cadri?: string;
  quantity: number;
  receiptDate: string;
  wasteType: string;
}

export interface WasteEntry {
  classification?: string;
  code?: string;
  description: string;
  quantity?: number;
  technology?: string;
  unit?: string;
}

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
  'receiptEntries',
] as const satisfies readonly (keyof CdfExtractedData)[];
