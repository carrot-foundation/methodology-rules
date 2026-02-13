import type {
  BaseExtractedData,
  ExtractedField,
} from '@carrot-fndn/shared/document-extractor';
import type { NonEmptyString } from '@carrot-fndn/shared/types';

export interface ScaleTicketExtractedData extends BaseExtractedData {
  documentType: 'scaleTicket';
  finalWeight?: ExtractedField<WeightData>;
  initialWeight?: ExtractedField<WeightData>;
  netWeight: ExtractedField<WeightData>;
  ticketNumber?: ExtractedField<NonEmptyString>;
  transporter?: ExtractedField<TransporterData>;
  vehiclePlate?: ExtractedField<NonEmptyString>;
}

export interface TransporterData {
  code: NonEmptyString;
  name: NonEmptyString;
}

export interface WeightData {
  timestamp?: Date;
  unit: NonEmptyString;
  value: number;
}
