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
  issueDate: ExtractedField<NonEmptyString>;
  receiver: ExtractedField<EntityInfo>;
  transporter: ExtractedField<EntityInfo>;
  vehiclePlate?: ExtractedField<NonEmptyString>;
  wasteClassification?: ExtractedField<NonEmptyString>;
  wasteQuantity?: ExtractedField<number>;
  wasteType?: ExtractedField<NonEmptyString>;
}

export const MTR_REQUIRED_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'transporter',
  'receiver',
] as const;

export const MTR_ALL_FIELDS = [
  'documentNumber',
  'issueDate',
  'generator',
  'transporter',
  'receiver',
  'vehiclePlate',
  'driverName',
  'wasteType',
  'wasteQuantity',
  'wasteClassification',
] as const;
