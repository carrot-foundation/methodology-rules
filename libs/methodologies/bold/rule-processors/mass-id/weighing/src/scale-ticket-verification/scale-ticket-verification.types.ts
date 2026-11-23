import type { ScaleTicketExtractedData } from '@carrot-fndn/shared/document-extractor-scale-ticket';
import type { RenderedRuleFinding } from '@carrot-fndn/shared/rule/result';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';
import type { AdditionalVerification } from '@carrot-fndn/shared/types';

// The two net weights the report shows for a mismatch, in kg: the "Weighing" event's and the ticket's
export interface ScaleTicketCrossValidation {
  netWeight: { event: number; extracted: number };
}

export interface ScaleTicketVerificationContext {
  config: AdditionalVerification | undefined;
  expectedNetWeight: number | undefined;
  scaleTicketData?: ScaleTicketExtractedData | undefined;
}

export interface ScaleTicketVerificationDependencies {
  textExtractionInput: TextExtractionInput | undefined;
}

export interface ScaleTicketVerificationResult {
  crossValidation?: ScaleTicketCrossValidation;
  errors: RenderedRuleFinding[];
}
