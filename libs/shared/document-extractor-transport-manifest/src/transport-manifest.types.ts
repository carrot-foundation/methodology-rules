import type {
  BaseExtractedData,
  EntityInfo,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface MtrExtractedData extends BaseExtractedData {
  documentNumber: ExtractedField<NonEmptyString>;
  documentType: 'transportManifest';
  driverName?: ExtractedField<NonEmptyString>;
  generator: ExtractedField<EntityInfo>;
  hauler: ExtractedField<EntityInfo>;
  issueDate: ExtractedField<NonEmptyString>;
  receiver: ExtractedField<EntityInfo>;
  receivingDate?: ExtractedField<NonEmptyString>;
  transportDate?: ExtractedField<NonEmptyString>;
  vehiclePlate?: ExtractedField<NonEmptyString>;
  wasteClassification?: ExtractedField<NonEmptyString>;
  wasteQuantity?: ExtractedField<number>;
  wasteTypes?: ExtractedField<WasteTypeEntry[]>;
}

export interface WasteTypeEntry {
  code?: string;
  description: string;
}

export const MTR_REQUIRED_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'hauler',
  'receiver',
] as const;

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
  'wasteQuantity',
  'wasteClassification',
] as const;
