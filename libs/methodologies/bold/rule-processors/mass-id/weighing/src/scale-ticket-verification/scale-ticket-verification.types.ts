import type { ScaleTicketExtractedData } from '@carrot-fndn/shared/document-extractor-scale-ticket';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';
import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

export interface ScaleTicketVerificationContext {
  config: MethodologyAdditionalVerification | undefined;
  expectedNetWeight: number | undefined;
  scaleTicketData?: ScaleTicketExtractedData | undefined;
}

export interface ScaleTicketVerificationDependencies {
  textExtractionInput: TextExtractionInput | undefined;
}

export interface ScaleTicketVerificationResult {
  errors: string[];
}
