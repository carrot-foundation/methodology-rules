import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';
import { DocumentMatcher } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';

import { CertificateUniquenessCheck } from './certificate-uniqueness-check.processor';

export const certificateUniquenessCheckLambda = (
  certificateMatcher: DocumentMatcher,
  methodologySlug: BoldMethodologySlug,
) => {
  const instance = new CertificateUniquenessCheck(
    certificateMatcher,
    methodologySlug,
  );

  return wrapRuleIntoLambdaHandler(instance);
};
