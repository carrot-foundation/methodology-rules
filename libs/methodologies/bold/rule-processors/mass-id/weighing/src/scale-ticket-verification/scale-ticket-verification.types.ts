import type { ScaleTicketData } from '@carrot-fndn/shared/scale-ticket-extractor';
import type { TextractServiceInput } from '@carrot-fndn/shared/text-extractor';
import type {
  MethodologyAdditionalVerification,
  MethodologyAdditionalVerificationAttributeValue,
} from '@carrot-fndn/shared/types';

export type ScaleTicketLayout = 'layout1';

export interface ScaleTicketVerificationConfig
  extends MethodologyAdditionalVerification {
  scaleTicketLayout: ScaleTicketLayout;
  verificationType: 'scaleTicket';
}

export type ScaleTicketVerificationConfigAttributeValue =
  MethodologyAdditionalVerificationAttributeValue;

export interface ScaleTicketVerificationContext {
  config: ScaleTicketVerificationConfig | undefined;
  expectedNetWeight: number | undefined;
  scaleTicketData?: ScaleTicketData;
}

export interface ScaleTicketVerificationDependencies {
  textractServiceInput: TextractServiceInput | undefined;
}

export interface ScaleTicketVerificationResult {
  errors: string[];
}
