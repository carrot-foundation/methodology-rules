import type { ScaleTicketData } from '@carrot-fndn/shared/scale-ticket-extractor';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';
import type {
  MethodologyAdditionalVerification,
  MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';

export type ScaleTicketLayout = 'layout1';

export type ScaleTicketVerificationConfig = MethodologyAdditionalVerification;

export type ScaleTicketVerificationConfigAttributeValue =
  MethodologyAdditionalVerificationAttributeValue;

export interface ScaleTicketVerificationContext {
  config: ScaleTicketVerificationConfig | undefined;
  expectedNetWeight: number | undefined;
  scaleTicketData?: ScaleTicketData;
}

export interface ScaleTicketVerificationDependencies {
  textExtractionInput: TextExtractionInput | undefined;
}

export interface ScaleTicketVerificationResult {
  errors: string[];
}
