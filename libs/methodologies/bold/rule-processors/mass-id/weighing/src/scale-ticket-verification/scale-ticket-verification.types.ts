import type { ScaleTicketData } from '@carrot-fndn/shared/scale-ticket-extractor';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';
import type { MethodologyAdditionalVerification } from '@carrot-fndn/shared/types';

export type ScaleTicketLayout = 'layout1';

export interface ScaleTicketVerificationContext {
  config: MethodologyAdditionalVerification | undefined;
  expectedNetWeight: number | undefined;
  scaleTicketData?: ScaleTicketData | undefined;
}

export interface ScaleTicketVerificationDependencies {
  textExtractionInput: TextExtractionInput | undefined;
}

export interface ScaleTicketVerificationResult {
  errors: string[];
}
