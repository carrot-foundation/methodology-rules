import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { noConflictingCertificateOrCreditLambda } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/no-conflicting-certificate-or-credit';
export const handler = noConflictingCertificateOrCreditLambda(
  RECYCLED_ID,
  'bold-recycling',
);
