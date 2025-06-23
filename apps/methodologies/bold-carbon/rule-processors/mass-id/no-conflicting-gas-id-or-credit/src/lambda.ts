import { GAS_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { noConflictingCertificateOrCreditLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';

export const handler = noConflictingCertificateOrCreditLambda(
  GAS_ID,
  BoldMethodologySlug.CARBON,
);
