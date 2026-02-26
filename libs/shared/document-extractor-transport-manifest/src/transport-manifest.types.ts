import type {
  BaseExtractedData,
  ExtractedEntityWithAddressInfo,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface ExtractedWasteTypeEntry {
  classification?: ExtractedField<string>;
  code: ExtractedField<string>;
  description: ExtractedField<string>;
  quantity: ExtractedField<number | undefined>;
  unit: ExtractedField<string>;
}

export interface MtrExtractedData extends BaseExtractedData {
  documentNumber?: ExtractedField<NonEmptyString>;
  documentType: 'transportManifest';
  driverName?: ExtractedField<string>;
  generator?: ExtractedEntityWithAddressInfo;
  hauler?: ExtractedEntityWithAddressInfo;
  issueDate?: ExtractedField<NonEmptyString>;
  receiver?: ExtractedEntityWithAddressInfo;
  receivingDate?: ExtractedField<NonEmptyString>;
  transportDate?: ExtractedField<NonEmptyString>;
  vehiclePlate?: ExtractedField<string>;
  wasteTypes?: ExtractedWasteTypeEntry[];
}

export interface WasteTypeEntryData {
  classification?: string;
  code?: string;
  description: string;
  quantity?: number;
  unit?: string;
}

export const MTR_ALL_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'hauler',
  'receiver',
  'transportDate',
  'receivingDate',
  'vehiclePlate',
  'driverName',
  'wasteTypes',
] as const satisfies readonly (keyof MtrExtractedData)[];
