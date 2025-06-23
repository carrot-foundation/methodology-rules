import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';

import { NoConflictingCertificateOrCreditProcessor } from './no-conflicting-certificate-or-credit.processor';

export const noConflictingCertificateOrCreditLambda = (
  certificateMatcher: DocumentMatcher,
  methodologySlug: BoldMethodologySlug,
) => {
  const instance = new NoConflictingCertificateOrCreditProcessor(
    certificateMatcher,
    methodologySlug,
  );

  return wrapRuleIntoLambdaHandler(instance);
};
