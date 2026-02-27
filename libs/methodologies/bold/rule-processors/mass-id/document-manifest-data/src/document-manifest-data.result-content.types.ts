import type {
  ComparisonResult,
  ExtractionConfidence,
  ExtractionMetadata,
  FieldComparisonBase,
  ReviewReason,
} from '@carrot-fndn/shared/document-extractor';

export type AttachmentCrossValidation = CdfCrossValidation | MtrCrossValidation;

export interface CdfCrossValidation {
  cdfTotalWeight: CdfTotalWeightComparison | null;
  documentNumber: FieldComparison;
  generator: EntityComparison | null;
  issueDate: FieldComparison;
  mtrNumbers: MtrNumbersComparison;
  processingPeriod: ProcessingPeriodComparison;
  recycler: EntityComparison | null;
  wasteQuantityWeight: null | WasteQuantityComparison;
  wasteType: WasteTypeComparison;
}

export type CdfTotalWeightComparison = FieldComparisonBase<
  null | number,
  number
>;

export type DocumentManifestResultContent = {
  crossValidation: Partial<AttachmentCrossValidation>;
  extractionMetadata?: Record<string, ExtractionMetadata>;
  failReasons?: ReviewReason[];
  reviewReasons?: ReviewReason[];
};

export interface EntityComparison extends ComparisonResult {
  address?: {
    addressSimilarity?: string;
    confidence: ExtractionConfidence | null;
    event?: string;
    extracted: string;
  };
  confidence: ExtractionConfidence | null;
  eventName: null | string;
  eventTaxId: null | string;
  extractedName: string;
  extractedTaxId: string;
  nameSimilarity: null | string;
  taxIdMatch: boolean | null;
}

export interface FieldComparison extends FieldComparisonBase {
  daysDiff?: null | number;
  similarity?: null | string;
}

export interface MtrCrossValidation {
  documentNumber: FieldComparison;
  generator: EntityComparison | null;
  hauler: EntityComparison | null;
  issueDate: FieldComparison;
  receiver: EntityComparison | null;
  receivingDate: FieldComparison;
  transportDate: FieldComparison;
  vehiclePlate: FieldComparison;
  wasteQuantityWeight: null | WasteQuantityComparison;
  wasteType: WasteTypeComparison;
}

export type MtrNumbersComparison = Omit<
  FieldComparisonBase<null | string[], string[]>,
  'confidence'
>;

export interface ProcessingPeriodComparison extends FieldComparisonBase {
  end?: string;
  start?: string;
}

export interface WasteQuantityComparison
  extends FieldComparisonBase<null | number, null | number> {
  discrepancyPercentage: null | string;
  extractedQuantity: null | number;
  extractedUnit: null | string;
}

export interface WasteTypeComparison extends ComparisonResult {
  confidence?: ExtractionConfidence | null;
  entries: null | WasteTypeEntry[];
  eventCode: null | string;
  eventDescription: null | string;
}

export interface WasteTypeEntry extends ComparisonResult {
  descriptionSimilarity: null | string;
  extracted: null | string;
  isCodeMatch: boolean | null;
}

export { type ReviewReason } from '@carrot-fndn/shared/document-extractor';
